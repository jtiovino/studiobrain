import UserSettingsForm from '@/components/UserSettingsForm';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function SettingsPage() {
  return (
    <div className="p-4">
      <ErrorBoundary>
        <UserSettingsForm />
      </ErrorBoundary>
    </div>
  );
}
