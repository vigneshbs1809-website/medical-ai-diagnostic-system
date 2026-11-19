import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = "Executing model inference...", subtext = "Please wait while the neural network processes the specimen tensor" }) {
  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-medical-accent-light flex items-center justify-center text-medical-accent mb-4">
        <Loader2 className="w-6 h-6 animate-spin text-medical-accent" />
      </div>
      <h4 className="text-sm font-semibold text-medical-primary">
        {message}
      </h4>
      <p className="text-xs text-medical-secondary max-w-sm mt-1">
        {subtext}
      </p>
    </div>
  );
}
