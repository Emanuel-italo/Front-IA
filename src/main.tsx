import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./store/AppStore";
import { AppLayout, RequireAuth } from "./components/Layout";
import { Cadastro, Login } from "./pages/Auth";
import { Busca } from "./pages/Busca";
import { Resultado } from "./pages/Resultado";
import { DetalheRota } from "./pages/DetalheRota";
import { NovoRelato, Relatos } from "./pages/Relatos";
import { MinhasRotas } from "./pages/MinhasRotas";
import { Perfil } from "./pages/Perfil";
import { Sobre } from "./pages/Sobre";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<AppLayout />}>
            <Route path="/sobre" element={<Sobre />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Busca />} />
              <Route path="/resultado" element={<Resultado />} />
              <Route path="/rota/:id" element={<DetalheRota />} />
              <Route path="/relatos" element={<Relatos />} />
              <Route path="/relatos/novo" element={<NovoRelato />} />
              <Route path="/minhas-rotas" element={<MinhasRotas />} />
              <Route path="/perfil" element={<Perfil />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
);
