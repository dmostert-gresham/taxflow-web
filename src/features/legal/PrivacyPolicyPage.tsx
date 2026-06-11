import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-teal" />
          </div>
          <span className="font-display font-bold text-navy">TaxFuse</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="font-display text-3xl font-bold text-navy mb-2">Privacy Policy</h1>
          <p className="text-slate-500 text-sm mb-8">Effective date: 1 May 2026 · Last updated: 1 May 2026</p>

          <div className="prose prose-slate max-w-none space-y-8 text-sm text-slate-700 leading-relaxed">

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">1. Who we are</h2>
              <p>
                TaxFuse is a tax management platform. We help individuals, businesses, and tax
                practitioners manage tax returns, documents, and compliance obligations.
              </p>
              <p className="mt-2">
                This policy is governed by applicable data protection legislation. For questions, contact us at{' '}
                <a href="mailto:privacy@taxfuse" className="text-navy hover:underline">
                  privacy@taxfuse
                </a>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">2. Information we collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account information:</strong> full name, email address, Taxpayer Identification Number (TIN), account type.</li>
                <li><strong>Financial information:</strong> income figures, deductions, PAYE paid, and other tax-related data you enter.</li>
                <li><strong>Documents:</strong> files you upload (payslips, invoices, tax certificates).</li>
                <li><strong>Usage data:</strong> pages visited, features used, timestamps — collected for service improvement and error diagnosis.</li>
                <li><strong>Payment information:</strong> subscription plan and payment status. We do <strong>not</strong> store card numbers; payments are processed by DPO Group.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">3. Why we process your information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To provide and operate the TaxFuse service.</li>
                <li>To calculate your tax liability and generate pre-filled return data.</li>
                <li>To process subscription payments via DPO Group.</li>
                <li>To diagnose application errors and maintain service reliability.</li>
                <li>To respond to your support queries.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">4. Who we share your information with</h2>
              <p>We do not sell your personal information. We share it only with:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>
                  <strong>DPO Group</strong> — payment processing for subscriptions. Your payment data
                  is subject to DPO's privacy policy.
                </li>
                <li>
                  <strong>Anthropic (Claude API)</strong> — when you use the AI Tax Assistant, your
                  query is sent to Anthropic's API. We strip personally identifiable information
                  before transmission where possible. Anthropic processes this data under its own
                  privacy policy.
                </li>
                <li>
                  <strong>Supabase</strong> — our database host stores your data in cloud infrastructure.
                  Data is encrypted at rest.
                </li>
                <li>
                  <strong>Sentry</strong> — application error monitoring. Error reports are configured
                  to exclude personally identifiable information (email addresses, request bodies).
                </li>
                <li>
                  <strong>Railway</strong> — our cloud hosting provider for the application backend.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">5. How long we keep your information</h2>
              <p>
                We retain your account and tax records for as long as your account is active, and for
                up to <strong>5 years</strong> after account deletion to comply with applicable tax record-keeping
                requirements. Error logs are retained for 90 days.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">6. Your rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Access the personal information we hold about you.</li>
                <li>Correct inaccurate information.</li>
                <li>Request deletion of your account and personal data.</li>
                <li>Object to processing in certain circumstances.</li>
                <li>Lodge a complaint with the relevant Information Regulator.</li>
              </ul>
              <p className="mt-3">
                To delete your account, go to <strong>Profile → Delete my account</strong> within the
                app. For other requests, email{' '}
                <a href="mailto:privacy@taxfuse" className="text-navy hover:underline">
                  privacy@taxfuse
                </a>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">7. Security</h2>
              <p>
                We use industry-standard measures including TLS encryption in transit, encrypted
                storage at rest, JWT-based authentication, and rate limiting. No system is perfectly
                secure; please notify us immediately at{' '}
                <a href="mailto:security@taxfuse" className="text-navy hover:underline">
                  security@taxfuse
                </a>{' '}
                if you suspect a breach.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">8. Changes to this policy</h2>
              <p>
                We will notify registered users by email of any material changes at least 14 days
                before they take effect. Continued use of the service after that date constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">9. Contact</h2>
              <p>
                TaxFuse<br />
                Email: <a href="mailto:privacy@taxfuse" className="text-navy hover:underline">privacy@taxfuse</a>
              </p>
            </section>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/login" className="text-navy hover:underline">Back to sign in</Link>
          {' · '}
          <Link to="/register" className="text-navy hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  )
}
