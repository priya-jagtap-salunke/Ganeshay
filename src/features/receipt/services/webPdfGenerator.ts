type Html2PdfFactory = () => {
  set: (options: Record<string, unknown>) => ReturnType<Html2PdfFactory>;
  from: (element: HTMLElement) => ReturnType<Html2PdfFactory>;
  outputPdf: (type: 'blob') => Promise<Blob>;
};

declare global {
  interface Window {
    html2pdf?: Html2PdfFactory;
  }
}

const HTML2PDF_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

async function loadHtml2Pdf(): Promise<Html2PdfFactory> {
  try {
    const module = await import('html2pdf.js');
    return module.default as Html2PdfFactory;
  } catch {
    if (typeof window === 'undefined') {
      throw new Error('PDF generation is only available in the browser');
    }

    if (window.html2pdf) {
      return window.html2pdf;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HTML2PDF_CDN;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(
          new Error(
            'Could not load PDF library. Run npm install and restart the app.'
          )
        );
      document.head.appendChild(script);
    });

    if (!window.html2pdf) {
      throw new Error('PDF library failed to initialize');
    }

    return window.html2pdf;
  }
}

/** Generates a PDF blob URL from HTML using an isolated iframe (web only). */
export async function generatePdfBlobUrlFromHtml(html: string): Promise<string> {
  if (typeof document === 'undefined') {
    throw new Error('PDF generation is only available in the browser');
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  iframe.style.background = '#FFFAF5';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Could not create print frame');
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    const win = iframe.contentWindow;
    if (win?.document.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.onload = () => resolve();
  });

  const root = doc.getElementById('invoice-root') ?? doc.body;

  // Wait for images (logo, QR) to finish loading.
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    const html2pdf = await loadHtml2Pdf();
    const blob = await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: 'receipt.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: 794,
          windowWidth: 794,
          backgroundColor: '#FFFAF5',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(root)
      .outputPdf('blob');

    return URL.createObjectURL(blob);
  } finally {
    document.body.removeChild(iframe);
  }
}
