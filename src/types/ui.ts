export interface Persona {
  role: string;
  link: string;
  description: string;
  [key: string]: any;
}
type ComponentRef = {
  type: React.ComponentType<any>;
  props: Record<string, any>;
};

export type TableColumns = {
  title: string;
  key: string;
  formatter?: (value: any, row: Record<string, any>) => string | ComponentRef;
}[];

export type TableData = {
  [key: string]: any;
}[];
