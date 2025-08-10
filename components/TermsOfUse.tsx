import React from 'react';

export default function TermsOfUse() {
  return (
    <div className="space-y-6 sm:space-y-4">
      <div className="space-y-4 sm:space-y-3">
        <h1 className="text-2xl font-bold text-foreground">Terms of Use</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: August 7, 2025
        </p>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Welcome to StudioBrain, a digital tool designed to assist musicians
          with theory, tone, production, and practice. These Terms of Use govern
          your access to and use of StudioBrain.
        </p>
        <p>
          By using StudioBrain, you agree to be bound by these terms. If you do
          not agree, please do not use the service.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          1. Use of the App
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 sm:space-y-2">
          <p>
            StudioBrain is provided &ldquo;as is&rdquo; for educational and
            informational purposes. It is not a substitute for professional
            music instruction or legal advice.
          </p>
          <p>You agree not to use StudioBrain to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Violate any law or regulation</li>
            <li>Generate or distribute copyrighted materials</li>
            <li>Interfere with the operation of the service</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. Accounts</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You are responsible for maintaining the confidentiality of your
          account and any activity under it. Do not share access with others.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. AI Content</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          StudioBrain uses OpenAI to generate suggestions and educational
          material. You understand that these outputs may be inaccurate or
          incomplete. StudioBrain is not liable for any decisions made based on
          this content.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          4. Termination
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We reserve the right to suspend or terminate access at our discretion,
          particularly for abuse, misuse, or violations of these terms.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          5. Limitation of Liability
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          StudioBrain and its developer(s) are not liable for any indirect,
          incidental, or consequential damages arising out of your use of the
          service.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Changes</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may update these Terms at any time. Continued use of StudioBrain
          after changes are posted means you accept those changes.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          7. Age Requirements
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You must be at least 13 years old to use StudioBrain. If you are under
          18, you confirm that you have parental consent to use this service.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          8. Governing Law
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These Terms are governed by the laws of the United States. Any
          disputes will be resolved in the courts of the United States.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          9. Intellectual Property
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You retain ownership of any original content you create using
          StudioBrain. However, AI-generated suggestions and content are not
          copyrightable and enter the public domain.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          10. Data Security
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          In the event of a data security incident, we will notify affected
          users within 72 hours via email and take immediate steps to secure the
          system.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-3">
        <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have any questions, contact:{' '}
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
