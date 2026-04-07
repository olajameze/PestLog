import PWAInstallPrompt from '../components/PWAInstallPrompt';
import LandingHeader from '../components/landing/LandingHeader';
import LandingMain from '../components/landing/LandingMain';
import LandingFAQ from '../components/landing/LandingFAQ';
import LandingFooter from '../components/landing/LandingFooter';

export default function Home() {
  return (
    <div className="bg-white">
      <PWAInstallPrompt />
      <LandingHeader />
      <LandingMain />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}