import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import Home from './pages/Home';
import Rutina from './pages/Rutina';
import Entreno from './pages/Entreno';
import Historial from './pages/Historial';
import Progreso from './pages/Progreso';
import Ajustes from './pages/Ajustes';
import Campanas from './pages/Campanas';

const Layout = ({ children }) => (
  <div className="wave-bg min-h-screen">
    <NavBar />
    <main className="pt-16 pb-20 px-4 max-w-lg mx-auto">
      {children}
    </main>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entreno/:entrenoId" element={<Entreno />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rutina" element={<Rutina />} />
              <Route path="/historial" element={<Historial />} />
              <Route path="/progreso" element={<Progreso />} />
              <Route path="/ajustes" element={<Ajustes />} />
              <Route path="/campanas" element={<Campanas />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}
