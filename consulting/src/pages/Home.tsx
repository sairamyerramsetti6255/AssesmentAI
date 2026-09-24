import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteHeader.tsx'

const SERVICES = [
  {
    title: 'Mobile & Web Apps',
    text: 'Client-facing products built around how your teams and customers actually work.',
  },
  {
    title: 'Custom Enterprise Solutions',
    text: 'Systems shaped to your operations, not a generic package forced onto the business.',
  },
  {
    title: 'Integrated Security Services',
    text: 'Security built into the work, from access and identity through day-to-day operations.',
  },
  {
    title: 'Application Service Provider',
    text: 'Applications hosted, supported, and improved so your staff can stay on the business.',
  },
  {
    title: 'Cybersecurity Services',
    text: 'Practical protection for the systems, data, and compliance issues you already face.',
  },
  {
    title: 'Custom GPT & Copilot',
    text: 'Custom GPT and Copilot systems that automate key workflows with a measurable return.',
  },
  {
    title: 'PSA / RMM Automation',
    text: 'Automate tools such as ConnectWise and HaloPSA so manual ticket work falls away.',
  },
  {
    title: 'Fractional Leadership',
    text: 'Strategy, innovation, and technology leadership under one expert partner.',
  },
]

const STEPS = [
  { n: '01', title: 'Tell us who you are', text: 'Company, website, and how we should reach you.' },
  { n: '02', title: 'Talk about the business', text: 'Type or speak about enhancements, expectations, and gaps.' },
  { n: '03', title: 'Answer ten questions', text: 'One at a time, including the questions our team always asks. Voice or options.' },
]

export function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-pbs-navy text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pbs-gold">AI & Automation Consulting</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
                Understand your IT gaps before you buy the next tool.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-pbs-100">
                Fractional leadership, strategy, and innovation under one expert partner. Start a free assessment:
                tell us about the company, speak about the work, and answer a short set of questions written for your situation.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/assess" className="rounded-full bg-pbs-gold px-6 py-3 font-semibold text-pbs-900 hover:bg-white">
                  Start your AI assessment
                </Link>
                <a href="#services" className="rounded-full border border-white/30 px-6 py-3 font-semibold hover:bg-white/10">
                  See services
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold text-pbs-gold">What you will do</p>
              <ul className="mt-4 space-y-4">
                {STEPS.map((step) => (
                  <li key={step.n} className="flex gap-4">
                    <span className="text-sm font-semibold text-pbs-300">{step.n}</span>
                    <span>
                      <span className="block font-semibold">{step.title}</span>
                      <span className="mt-1 block text-sm text-pbs-100">{step.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pbs-600">Total I.T. Care</p>
          <h2 className="mt-2 text-3xl font-semibold text-pbs-navy">Services</h2>
          <p className="mt-3 max-w-2xl text-pbs-700">
            Click through to the assessment when you are ready. Our team uses what you share to understand the domain before anyone proposes a project.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <article key={service.title} className="rounded-2xl border border-pbs-line bg-white p-5">
                <h3 className="font-semibold text-pbs-navy">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pbs-700">{service.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold text-pbs-navy">A conversation, then a short questionnaire.</h2>
              <p className="mt-4 text-pbs-700">
                Describe the enhancements you want, what you expect, and where the current IT falls short. You can type it or say it.
                We only ask follow-up questions where the answer is still missing, never more than ten, and three of them are the ones our consultants always need.
              </p>
              <Link to="/assess" className="mt-6 inline-block rounded-full bg-pbs-600 px-6 py-3 font-semibold text-white hover:bg-pbs-700">
                Begin the free assessment
              </Link>
            </div>
            <blockquote className="rounded-3xl bg-pbs-50 p-6 text-pbs-800">
              <p className="text-lg leading-relaxed">
                “We are struggling with manual data entry in finance and looking to automate invoice processing.”
              </p>
              <p className="mt-4 text-sm text-pbs-600">That kind of detail is enough to start. Speak it, or type it.</p>
            </blockquote>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl font-semibold text-pbs-navy">Talk to us</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-pbs-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-pbs-600">Office</p>
              <p className="mt-2">#25 East Ave Centreville<br />P.O. Box N1836<br />Nassau, Bahamas</p>
            </div>
            <div className="rounded-2xl border border-pbs-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-pbs-600">Phone</p>
              <p className="mt-2"><a className="font-semibold text-pbs-700" href="tel:+12423973100">+1 242 397 3100</a></p>
            </div>
            <div className="rounded-2xl border border-pbs-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-pbs-600">Email</p>
              <p className="mt-2"><a className="font-semibold text-pbs-700" href="mailto:info@pbshope.com">info@pbshope.com</a></p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
