import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const STEPS: Step[] = [
  {
    target: '.dashboard-header',
    content: 'Welcome to Pest Trace! This dashboard shows your technicians, recent logbook entries, and key compliance metrics.',
    placement: 'bottom',
  },
  {
    target: '.logbook-form',
    content: 'Create compliance logbook entries here. Works offline - entries sync automatically when back online.',
    placement: 'right',
  },
  {
    target: '.settings-card',
    content: 'Manage company settings, billing, and compliance requirements (signatures/photos).',
    placement: 'left',
  },
  {
    target: '.offline-banner',
    content: 'See your sync status here. Pest Trace works offline with automatic background sync.',
    placement: 'top',
  },
];


interface Step {
  target: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export default function OnboardingTour() {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasSeenTour = localStorage.getItem('pesttrace-tour-seen');
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem('pesttrace-tour-seen', 'true');
    setIsOpen(false);
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  if (!mounted || !isOpen) return null;

  const step = STEPS[currentStep];
  const targetElement = document.querySelector(step.target);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
        {/* Tour Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 bg-white/95 backdrop-blur-sm rounded-t-3xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
            <span className="font-semibold text-gray-900">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={skipTour}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Tour Content */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {currentStep + 1}. {step.content.split('.')[0]}.
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            {step.content.split('.')[1] || step.content}
          </p>

          {/* Progress Dots */}
          <div className="flex gap-2 mb-8">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-500 scale-125'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed p-2 -m-2 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <div className="flex-1" />
            
            <button
              onClick={nextStep}
              className="btn btn-primary px-6 py-2.5 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
              {currentStep !== STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-1 inline" />
              )}
            </button>
          </div>
        </div>

        {/* Floating Spotlight */}
        {targetElement && (
          <div 
            className="fixed pointer-events-none z-[9999] w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] border-4 border-dashed border-blue-400 border-opacity-30 rounded-3xl"
            style={{
              left: (targetElement as HTMLElement).getBoundingClientRect().left - 1 + 'px',
              top: (targetElement as HTMLElement).getBoundingClientRect().top - 1 + 'px',
              width: (targetElement as HTMLElement).offsetWidth + 2 + 'px',
              height: (targetElement as HTMLElement).offsetHeight + 2 + 'px',
            }}
          />
        )}
      </div>
    </div>
  );
}
