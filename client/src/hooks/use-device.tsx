import { useState, useEffect } from "react";

interface DeviceInfo {
  isMobile: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < 768,
        isDesktop: width >= 768,
        screenWidth: width,
        screenHeight: height,
      });
    };

    // Initial detection
    updateDeviceInfo();

    // Listen for window resize
    window.addEventListener('resize', updateDeviceInfo);
    
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}