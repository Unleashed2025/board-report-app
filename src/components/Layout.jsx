import Header from './Header';
import NavBar from './NavBar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0D2338] text-white">
      <Header />
      <NavBar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
