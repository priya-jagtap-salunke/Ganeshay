/**
 * Expo config plugin: harden the generated Podfile so the `fmt` pod compiles
 * on newer Apple Clang (Xcode 16+/26+), where fmt 11.x (via RCT-Folly) breaks
 * on consteval.
 *
 * Two layers:
 * 1) GCC_PREPROCESSOR_DEFINITIONS FMT_USE_CONSTEVAL=0 (works when fmt respects it)
 * 2) Patch Pods/fmt/include/fmt/base.h (needed for fmt 11.0.2 which overwrites -D)
 */
const {
  withPodfile,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const TAG = 'with-fmt-xcode-fix';

const POST_INSTALL_SNIPPET = `
  # @generated begin ${TAG}
  # Disable fmt consteval for newer Apple Clang (Xcode 16+/26+ / fmt 11.x).
  installer.pods_project.targets.each do |target|
    if target.name == 'fmt'
      target.build_configurations.each do |bc|
        bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        unless bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FMT_USE_CONSTEVAL=0')
          bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_CONSTEVAL=0'
        end
      end
    end
  end

  fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
  if File.exist?(fmt_base)
    content = File.read(fmt_base)
    unless content.include?('Xcode 26 workaround')
      patched = content.gsub(
        /#\\s*define FMT_USE_CONSTEVAL 1/,
        '# define FMT_USE_CONSTEVAL 0 // Xcode 26 workaround'
      )
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
        Pod::UI.puts '[${TAG}] Patched fmt/base.h (FMT_USE_CONSTEVAL=0)'
      end
    end
  end
  # @generated end ${TAG}
`;

function injectFmtFix(contents) {
  if (contents.includes(TAG)) {
    return contents;
  }

  const marker = 'react_native_post_install(';
  const idx = contents.lastIndexOf(marker);
  if (idx === -1) {
    return `${contents}\n\npost_install do |installer|${POST_INSTALL_SNIPPET}end\n`;
  }

  let i = idx;
  let depth = 0;
  let foundStart = false;
  for (; i < contents.length; i += 1) {
    const ch = contents[i];
    if (ch === '(') {
      depth += 1;
      foundStart = true;
    } else if (ch === ')') {
      depth -= 1;
      if (foundStart && depth === 0) {
        i += 1;
        break;
      }
    }
  }

  while (i < contents.length && (contents[i] === ' ' || contents[i] === '\r')) {
    i += 1;
  }
  if (contents[i] === '\n') {
    i += 1;
  }

  return contents.slice(0, i) + POST_INSTALL_SNIPPET + '\n' + contents.slice(i);
}

function withFmtXcodeFix(config) {
  return withPodfile(config, (cfg) => {
    cfg.modResults.contents = injectFmtFix(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = createRunOncePlugin(withFmtXcodeFix, TAG, '1.0.0');
