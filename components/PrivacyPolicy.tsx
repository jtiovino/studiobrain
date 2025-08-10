import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: August 7, 2025
        </p>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          This Privacy Policy explains how StudioBrain collects, uses, and
          protects your information.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          1. What We Collect
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>
            We collect the following data from users who are at least 13 years
            old:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Email address (for account access)</li>
            <li>Name (optional)</li>
            <li>Chat history</li>
            <li>Gear or settings preferences</li>
            <li>App usage data</li>
          </ul>
          <p>
            This information is used to improve your experience and personalize
            your session.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          2. How We Use Your Data
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>We use your data to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Provide and maintain the StudioBrain service</li>
            <li>Understand how the app is used</li>
            <li>Improve AI responses</li>
            <li>Contact you for feedback or updates (if needed)</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          3. Tools We Use
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>StudioBrain uses:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Supabase</strong> for authentication and data storage
            </li>
            <li>
              <strong>OpenAI</strong> for generating content (your prompts and
              conversation context may be sent to OpenAI for processing)
            </li>
            <li>
              <strong>Vercel Analytics</strong> for basic usage metrics (page
              views, performance)
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          4. Your Rights
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can request that your data be updated or deleted by contacting us
          at{' '}
          <a
            href="mailto:studiobrain.help@gmail.com"
            className="text-primary hover:underline"
          >
            studiobrain.help@gmail.com
          </a>
          .
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          5. Data Security
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We take reasonable measures to protect your information. However, no
          system is 100% secure.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">6. Changes</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may update this policy as the product evolves. We&apos;ll update
          the date above when we do.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          7. Data Retention
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your data for as long as your account is active or as needed
          to provide services. Chat history and settings are kept until you
          request deletion or your account is terminated. Usage analytics are
          kept for up to 2 years for service improvement purposes.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          8. International Data Transfers
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your data may be processed and stored in the United States and other
          countries where our service providers operate. By using StudioBrain,
          you consent to the transfer of your information to these locations.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          9. Data Security Incidents
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          In the event of a data breach that may affect your personal
          information, we will notify you within 72 hours via email and provide
          details about the incident and steps being taken to address it.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Questions? Contact:{' '}
          <a
            href="mailto:studiobrain.help@gmail.com"
            className="text-primary hover:underline"
          >
            studiobrain.help@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
