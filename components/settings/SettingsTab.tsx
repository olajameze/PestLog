import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';

type NotificationPreferences = {
  trialExpiry: boolean;
  renewal: boolean;
  certificationExpiry: boolean;
};

type Company = {
  id: string;
  name?: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  vatNumber?: string | null;
  requireSignature: boolean;
  requirePhotos: boolean;
  defaultReportRangeDays?: number | null;
  notificationPreferences?: NotificationPreferences | null;
};

type Subscription = {
  status: string;
  trialEndsAt?: string;
  plan?: string;
};

interface SettingsTabProps {
  company: Company;
  subscription: Subscription | null;
  onSubscribe: () => void;
  onManageSubscription: () => void;
  onUpdateCompanySettings: (settings: {
    name: string;
    phone?: string;
    address?: string;
    website?: string;
    vatNumber?: string;
    requireSignature: boolean;
    requirePhotos: boolean;
    defaultReportRangeDays: number;
    notificationPreferences: NotificationPreferences;
  }) => Promise<void>;
  onDeleteAccount: () => void;
  deletingAccount: boolean;
  savingSettings: boolean;
  checkoutLoading: boolean;
  portalLoading: boolean;
}

export default function SettingsTab({
  company,
  subscription,
  onSubscribe,
  onManageSubscription,
  onUpdateCompanySettings,
  onDeleteAccount,
  deletingAccount,
  savingSettings,
  checkoutLoading,
  portalLoading,
}: SettingsTabProps) {
  const [companyName, setCompanyName] = useState(company.name || '');
  const [phone, setPhone] = useState(company.phone || '');
  const [address, setAddress] = useState(company.address || '');
  const [website, setWebsite] = useState(company.website || '');
  const [vatNumber, setVatNumber] = useState(company.vatNumber || '');
  const [requireSignature, setRequireSignature] = useState(company.requireSignature ?? false);
  const [requirePhotos, setRequirePhotos] = useState(company.requirePhotos ?? false);
  const [defaultReportRangeDays, setDefaultReportRangeDays] = useState(company.defaultReportRangeDays ?? 30);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    trialExpiry: company.notificationPreferences?.trialExpiry ?? true,
    renewal: company.notificationPreferences?.renewal ?? true,
    certificationExpiry: company.notificationPreferences?.certificationExpiry ?? true,
  });

  const handleSaveSettings = () => {
    onUpdateCompanySettings({
      name: companyName.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      website: website.trim() || undefined,
      vatNumber: vatNumber.trim() || undefined,
      requireSignature,
      requirePhotos,
      defaultReportRangeDays,
      notificationPreferences,
    });
  };

  const currentPlanLabel = subscription?.plan ? subscription.plan.toUpperCase() : 'TRIAL';
  const trialEndsAtLabel = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString() : 'Not available';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-navy">Settings</h2>
      <Card className="space-y-6 p-8">
        <h3 className="text-xl font-bold text-navy">Company & Billing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Company Name"
            id="settings-company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <FormInput
            label="Billing Email"
            id="settings-billing-email"
            type="email"
            value={company.email}
            onChange={() => {}}
            readOnly
          />
          <FormInput
            label="Phone"
            id="settings-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <FormInput
            label="Website"
            id="settings-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
          <FormInput
            label="Address"
            id="settings-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <FormInput
            label="VAT Number"
            id="settings-vat-number"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
          />
          <FormInput
            label="Default report range (days)"
            id="settings-default-report-range"
            type="number"
            value={String(defaultReportRangeDays)}
            onChange={(e) => setDefaultReportRangeDays(Number(e.target.value) || 0)}
          />
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requireSignature}
                  onChange={(e) => setRequireSignature(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Require signature on reports</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requirePhotos}
                  onChange={(e) => setRequirePhotos(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Require photos on reports</span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h4 className="text-lg font-semibold text-navy">Notification preferences</h4>
          <div className="grid gap-4 mt-4 sm:grid-cols-2">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <input
                type="checkbox"
                checked={notificationPreferences.trialExpiry}
                onChange={(e) => setNotificationPreferences((prev) => ({ ...prev, trialExpiry: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Trial expiry reminders</span>
            </label>
            <label className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <input
                type="checkbox"
                checked={notificationPreferences.renewal}
                onChange={(e) => setNotificationPreferences((prev) => ({ ...prev, renewal: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Subscription renewal alerts</span>
            </label>
            <label className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <input
                type="checkbox"
                checked={notificationPreferences.certificationExpiry}
                onChange={(e) => setNotificationPreferences((prev) => ({ ...prev, certificationExpiry: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Certification expiry warnings</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? 'Saving settings...' : 'Save settings'}
          </Button>
          <span className="text-sm text-slate-500">Your changes will apply immediately to company account settings.</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Subscription status</p>
            <p className="mt-2 font-semibold text-slate-900">{subscription?.status || 'Unknown'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current plan</p>
            <p className="mt-2 font-semibold text-slate-900">{currentPlanLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Trial ends</p>
            <p className="mt-2 font-semibold text-slate-900">{trialEndsAtLabel}</p>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Use the billing portal to manage or cancel your plan. If your trial ends without a paid subscription, you will be prompted to upgrade to continue using the full application.
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onSubscribe} disabled={checkoutLoading} className="bg-gradient-to-r from-blue-500 to-purple-600">
            {checkoutLoading ? 'Loading...' : 'Choose Plan & Upgrade'}
          </Button>
          {subscription?.status === 'active' && (
            <Button onClick={onManageSubscription} disabled={portalLoading}>
              {portalLoading ? 'Opening Portal...' : 'Manage Subscription'}
            </Button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Delete account</p>
              <p className="text-sm text-slate-500">Permanently delete this account, cancel your subscription, and remove all company data.</p>
            </div>
            <Button variant="danger" onClick={onDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? 'Deleting...' : 'Delete account'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
