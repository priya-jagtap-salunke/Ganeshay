export { TelecallingPanel } from './components/TelecallingPanel';
export {
  useTelecallingContacts,
  useImportTelecallingContacts,
  useRecordCallOutcome,
  useDeleteTelecallingContact,
  useDeleteAllTelecallingContacts,
} from './hooks/useTelecallingContacts';
export { dialMobile } from './services/dialService';
export {
  isDeviceContactsSupported,
  loadDeviceContactOptions,
  deviceOptionsToImportInputs,
  syncContactsToDevice,
} from './services/deviceContactsService';
export type { DeviceContactOption } from './services/deviceContactsService';
export {
  isCallLogSupported,
  fetchRecentCallLogs,
} from './services/callLogService';
export type { CallLogEntry } from './services/callLogService';
export { shareStallDetailsOnWhatsApp } from './services/stallDetailsWhatsAppService';
export {
  DEFAULT_ENQUIRY_MESSAGE,
  DEFAULT_STALL_DETAILS_MESSAGE,
  ENQUIRY_MESSAGE_PLACEHOLDERS,
  STALL_DETAILS_MESSAGE_PLACEHOLDERS,
  buildStallDetailsWhatsAppMessage,
} from './utils/stallDetailsWhatsAppMessage';
export { parseTelecallingExcel, EXCEL_FORMAT_HINT } from './utils/parseExcelContacts';
