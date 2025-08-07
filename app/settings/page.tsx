import ErrorBoundary from '@/components/ErrorBoundary';
import UserSettingsForm from '@/components/UserSettingsForm';

export default function SettingsPage() {
  return (
    <div className="p-4">
      <ErrorBoundary>
        <UserSettingsForm />
      </ErrorBoundary>
    </div>
  );
}
