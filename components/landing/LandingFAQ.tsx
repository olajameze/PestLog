import { useState } from 'react';
import Link from 'next/link';
import { landingFaqs } from './content';

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-offwhite py-20">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-4xl font-bold text-navy sm:text-5xl">Frequently Asked Questions</h2>
        <div className="mt-10 space-y-4">
          {landingFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <details
                key={faq.question}
                open={isOpen}
                onToggle={(event) => setOpenIndex((event.currentTarget as HTMLDetailsElement).open ? idx : null)}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition duration-200 hover:shadow-soft"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-left text-base font-semibold text-navy transition hover:bg-zinc-50">
                  {faq.question}
                  <span className={`text-zinc-500 transition ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
                </summary>
                <div className="border-t border-zinc-200 px-5 py-4 text-sm text-zinc-600">
                  {faq.question === 'Do I need to download software?' ? (
                    <>
                      No, PestTrek works in the browser and can be installed as a PWA on mobile.{' '}
                      <Link href="/?showPwaPrompt=1" className="font-semibold text-primary-600 hover:underline">
                        Tap here to open install prompt
                      </Link>
                      .
                    </>
                  ) : (
                    faq.answer
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
