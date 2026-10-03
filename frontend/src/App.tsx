import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Escrow from "./pages/Escrow";
import Security from "./pages/Security";
import About from "./pages/About";
import { EscrowProvider } from "./lib/store";

export default function App() {
  return (
    <EscrowProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/escrow" element={<Escrow />} />
            <Route path="/security" element={<Security />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </EscrowProvider>
  );
}
