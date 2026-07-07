declare module 'react-native-call-log' {
  export interface CallLogItem {
    phoneNumber: string;
    name?: string;
    timestamp: string;
    duration: string;
    type: string;
  }

  const CallLogs: {
    load: (limit: number) => Promise<CallLogItem[]>;
  };

  export default CallLogs;
}
