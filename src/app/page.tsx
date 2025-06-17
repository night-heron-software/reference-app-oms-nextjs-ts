'use server';
import 'server-only';
import { redirect, RedirectType } from 'next/navigation';

export default async function HomePage() {
  redirect('/role',  RedirectType.replace);
}
