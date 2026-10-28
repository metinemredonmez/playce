import { redirect } from 'next/navigation';

// Gösterge paneli gelene kadar en acil kuyruk
export default function Home() {
  redirect('/moderasyon');
}
