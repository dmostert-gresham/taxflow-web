import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle2, Zap, Building2, Users, Star } from 'lucide-react'
import { api, formatNAD, extractErrorMessage } from '../../api/client'
import type { ApiResponse } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PLANS = [
  {
    id: 'BASIC',
    name: 'Basic',
    price: 0,
    icon: <Zap size={18} />,
    color: 'border-slate-200',
    badge: '',
    features: [
      'Tax return calculation & summary',
      'PAYE5 OCR upload',
      'ITAS return pre-fill',
      'ITX PDF download',
      'Deductions save & load',
    ],
    missing: [
      'Bank statement import & classification',
      'AI transaction categorisation',
      'AI deduction finder',
      'AI Tax Assistant',
      'Trial balance import & CIT calc',
      'Xero integration',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 99,
    icon: <Star size={18} />,
    color: 'border-teal',
    badge: 'Most Popular',
    features: [
      'Everything in Basic',
      'Bank statement import & classification',
      'AI transaction categorisation',
      'AI deduction finder',
      'AI Tax Assistant (Claude)',
      'Manual category editing',
    ],
    missing: [],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 499,
    icon: <Building2 size={18} />,
    color: 'border-navy/30',
    badge: '',
    features: [
      'Everything in Professional',
      'Trial Balance import',
      'CIT calculation',
      'Xero integration',
    ],
    missing: [],
  },
  {
    id: 'PRACTITIONER',
    name: 'Practitioner',
    price: 1499,
    icon: <Users size={18} />,
    color: 'border-coral/40',
    badge: '',
    features: [
      'Everything in Business',
      'Multi-client management (coming soon)',
      'Priority support',
    ],
    missing: [],
  },
]

export default function BillingPage() {
  const user = useAuthStore((s) => s.user)
  const isPractitioner = user?.role === 'PRACTITIONER'

  const { data: subscription, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ status: string; plan: string; expiresAt: string }>>(
        '/billing/status'
      )
      return res.data.data
    },
  })

  const subscribeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await api.post<ApiResponse<{ paymentUrl: string }>>('/billing/subscribe', { plan })
      return res.data.data
    },
    onSuccess: (data) => {
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank')
        // Poll for activation after payment
        setTimeout(() => refetch(), 5000)
      }
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const currentPlan = subscription?.plan ?? 'BASIC'
  const isActive    = subscription?.status === 'ACTIVE'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Billing & Plans</h1>
        <p className="page-subtitle">Choose the plan that fits your needs</p>
      </div>

      {/* Current plan status */}
      {subscription && (
        <div className={clsx(
          'card p-4 flex items-center justify-between',
          isActive ? 'bg-teal/5 border-teal/20 border' : 'bg-amber-50 border-amber-200 border'
        )}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className={isActive ? 'text-teal' : 'text-amber-500'} />
            <div>
              <span className="font-semibold text-navy text-sm">
                {isActive ? `${currentPlan} plan — Active` : 'No active subscription'}
              </span>
              {subscription.expiresAt && isActive && (
                <div className="text-xs text-slate-400 mt-0.5">
                  Renews {new Date(subscription.expiresAt).toLocaleDateString('en-NA', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id && isActive
          const isPro     = plan.id === 'PROFESSIONAL'
          const isRestricted = isPractitioner
            ? plan.id !== 'PRACTITIONER'
            : plan.id === 'PRACTITIONER'

          return (
            <div
              key={plan.id}
              className={clsx(
                'card p-5 flex flex-col border-2 relative',
                isRestricted && 'opacity-60',
                isCurrent ? 'border-teal' : plan.color,
                isPro && !isCurrent && 'border-teal/40'
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2
                                badge-green text-xs px-3 py-1 font-semibold">
                  ⭐ {plan.badge}
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2
                                bg-teal text-white text-xs px-3 py-1 rounded-full font-semibold">
                  Current plan
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  plan.id === 'BASIC'         ? 'bg-slate-100 text-slate-500' :
                  plan.id === 'PROFESSIONAL'  ? 'bg-teal/10 text-teal-dark' :
                  plan.id === 'BUSINESS'      ? 'bg-navy/10 text-navy' :
                                                'bg-coral/10 text-coral'
                )}>
                  {plan.icon}
                </div>
                <span className="font-display font-bold text-navy">{plan.name}</span>
              </div>

              <div className="mb-4">
                {plan.price === 0 ? (
                  <span className="font-display text-2xl font-bold text-navy">Free</span>
                ) : (
                  <div>
                    <span className="font-display text-2xl font-bold text-navy">
                      {formatNAD(plan.price)}
                    </span>
                    <span className="text-slate-400 text-sm">/mo</span>
                  </div>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 size={13} className="text-teal shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !isRestricted && plan.price > 0 && subscribeMutation.mutate(plan.id)}
                disabled={isCurrent || plan.price === 0 || isRestricted || subscribeMutation.isPending}
                className={clsx(
                  'w-full py-2 rounded-lg text-sm font-medium transition-colors',
                  isCurrent
                    ? 'bg-teal/10 text-teal-dark cursor-default'
                    : isRestricted
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : plan.price === 0
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : isPro
                          ? 'bg-teal text-white hover:bg-teal-light'
                          : 'bg-navy text-white hover:bg-navy-light'
                )}
              >
                {isCurrent ? 'Current plan' :
                 isRestricted ? 'Not available for your account type' :
                 plan.price === 0 ? 'Free forever' :
                 subscribeMutation.isPending ? 'Loading…' :
                 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Payment note */}
      <div className="text-center text-xs text-slate-400">
        Payments processed securely by DPO Group ·
        Cancel anytime
      </div>
    </div>
  )
}
