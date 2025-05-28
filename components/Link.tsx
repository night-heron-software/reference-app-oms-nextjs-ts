import { ComponentRef, FunctionComponent } from 'react';

interface LinkProps {
  href: string;
  value: string;
}

interface LinkProps {
  value: string;
  href: string;
}

const Link = ({ value, href }: LinkProps) => {
  return (
    <a href={href} className="text-blue-600 font-mono hover:underline">
      {value}
    </a>
  );
};

export default Link;

// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/components/Link.tsx
/* import React from 'react';

interface LinkProps {
  value: string;
  href: string;
}

const Link: React.FC<LinkProps> = ({ value, href }) => {
  return (
    <a href={href} className="text-blue-600 font-mono hover:underline">
      {value}
    </a>
  );
};

export default Link;
 */
