import blahajLogo from '@/assets/blahaj/logo.svg';

interface BlahajNibbleHeadingProps {
  code?: string | number;
  title: string;
}

export function BlahajNibbleHeading({ code, title }: BlahajNibbleHeadingProps) {
  const codeLabel = code != null ? String(code) : null;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-center">
      <div className="text-center sm:text-left">
        {codeLabel ? (
          <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {codeLabel}
          </p>
        ) : null}
        <h1
          className={`font-semibold text-foreground ${codeLabel ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}
        >
          {title}
        </h1>
      </div>
      <img
        src={blahajLogo}
        alt=""
        aria-hidden
        className="blahaj-nibble -mt-4 h-20 w-auto shrink-0 sm:-ml-8 sm:mt-0 md:-ml-10 sm:h-28"
      />
    </div>
  );
}
