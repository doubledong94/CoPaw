import { createGlobalStyle } from "antd-style";
import { ConfigProvider, bailianTheme } from "@agentscope-ai/design";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import BrowserLayout from "./layouts/BrowserLayout";
import "./styles/layout.css";
import "./styles/form-override.css";

const GlobalStyle = createGlobalStyle`
* {
  margin: 0;
  box-sizing: border-box;
}
`;

function App() {
  // 检测是否在Electron环境中
  const isElectron = typeof window !== 'undefined' &&
    (window as any).electron !== undefined;

  return (
    <BrowserRouter>
      <GlobalStyle />
      <ConfigProvider {...bailianTheme} prefix="copaw" prefixCls="copaw">
        {isElectron ? (
          <Routes>
            <Route path="/*" element={<BrowserLayout />} />
          </Routes>
        ) : (
          <MainLayout />
        )}
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
