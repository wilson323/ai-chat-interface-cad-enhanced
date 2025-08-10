interface NetworkInformation {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

interface Navigator {
  connection?: NetworkInformation;
  getBattery?: () => Promise<any>;
}
