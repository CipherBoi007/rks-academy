import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The sign-in screens' frame. On phones everything fits one screen without scrolling: a short photo banner, a
 * small crest and compact spacing. From md up it's the split layout, with the photo filling the left half.
 */
export function SignInLayout({
  eyebrow,
  headline,
  tagline,
  title,
  subtitle,
  footer,
  children,
}: {
  eyebrow: string;
  headline: ReactNode;
  tagline: string;
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="group flex min-h-dvh flex-col bg-white md:flex-row">
      {/* Phones: the photo banner takes the top ~30% of the screen, the sign-in sheet the rest. md and up: the
          photo fills the left half. */}
      <section className="relative h-[30dvh] min-h-[180px] shrink-0 overflow-hidden bg-navy short:h-[24dvh] short:min-h-[148px] md:h-auto md:min-h-dvh md:w-1/2">
        <Image
          src="/demo/banners/login-court.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/70 to-navy" aria-hidden />
        {/* Headline at the bottom of the photo, clear of the sheet that overlaps it by 1rem on phones. */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-9 sm:px-8 md:p-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent md:text-xs">{eyebrow}</p>
          <h1 className="mt-1.5 font-display text-[28px] font-bold uppercase leading-[0.95] text-white short:text-2xl sm:text-4xl md:mt-3 md:text-6xl">
            {headline}
          </h1>
          <p className="mt-4 hidden max-w-md text-lg text-white/80 md:block">{tagline}</p>
        </div>
      </section>

      {/* Centred in the space left, so a short form doesn't leave one big gap at the bottom. */}
      <section className="relative z-10 -mt-4 flex flex-1 items-center justify-center rounded-t-3xl bg-white px-4 py-6 short:py-3 md:mt-0 md:rounded-none md:px-8 md:py-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center">
            <Image
              src="/brand/crest.png"
              alt="Raja Kumaran Sethupathi Sports Academy crest"
              width={190}
              height={190}
              priority
              className="mx-auto h-16 w-16 short:h-12 short:w-12 tall:h-24 tall:w-24 group-has-[[data-step=code]]:hidden md:h-[170px] md:group-has-[[data-step=code]]:inline md:w-[170px]"
            />
            <h2 className="mt-2 font-display text-xl font-bold uppercase leading-tight tall:mt-3 tall:text-2xl md:mt-4 md:text-[32px]">{title}</h2>
            <p className="mt-0.5 text-sm text-muted tall:mt-1 tall:text-base md:mt-1 md:text-base">{subtitle}</p>
          </div>
          {children}
          <p className="mt-5 text-center text-sm text-muted short:mt-3 tall:mt-8 md:mt-8">{footer}</p>
        </div>
      </section>
    </div>
  );
}
