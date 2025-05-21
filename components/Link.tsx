interface LinkProps {
  href: string;
  value: string;
}

export default function Link({ href, value }: LinkProps) {
  return (
    <a href={href} className="text-blue-600 font-mono hover:underline">
      {value}
    </a>
  );
}
