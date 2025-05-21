import type { Component } from 'react';
export interface Persona {
  role: string;
  link: string; // Assuming 'link' is a property used by the Link component
  description: string;
  // Add other properties of a persona if they exist
  [key: string]: any; // Allow other properties
}

type ComponentRef = {
  type: Component<unknown, any>;
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
