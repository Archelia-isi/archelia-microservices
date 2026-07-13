import React from 'react';
import './AppSplashScreen.css';

interface AppSplashScreenProps {
  isLoading: boolean;
  appName: string;
  icon: React.ReactNode;
}

export default function AppSplashScreen({ isLoading, appName, icon }: AppSplashScreenProps) {
  return (
    <div className={`os-app-splash-screen ${isLoading ? 'os-app-splash-active' : 'fade-out'}`}>
      <div className="os-app-icon-wrapper">
        <div className="os-app-icon-spinner"></div>
        <div className="os-app-icon">
          {icon}
        </div>
      </div>
      <h1 className="os-app-splash-title">{appName}</h1>
    </div>
  );
}
