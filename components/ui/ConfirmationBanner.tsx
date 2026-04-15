type ConfirmationBannerProps = {
  type?: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
};

const toneStyles: Record<NonNullable<ConfirmationBannerProps['type']>, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

export default function ConfirmationBanner({ type = 'info', title, message }: ConfirmationBannerProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneStyles[type]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6">{message}</p>
    </div>
  );
}
