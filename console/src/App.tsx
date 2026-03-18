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

  // 在Electron环境中，根据URL路径决定使用哪个Layout
  // 如果是/models或其他设置页面，使用MainLayout
  // 否则使用BrowserLayout（聊天界面）
  const shouldUseBrowserLayout = isElectron &&
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/models') &&
    !window.location.pathname.startsWith('/environments') &&
    !window.location.pathname.startsWith('/security') &&
    !window.location.pathname.startsWith('/token-usage') &&
    !window.location.pathname.startsWith('/voice-transcription') &&
    !window.location.pathname.startsWith('/agents') &&
    !window.location.pathname.startsWith('/agent-config') &&
    !window.location.pathname.startsWith('/skills') &&
    !window.location.pathname.startsWith('/tools') &&
    !window.location.pathname.startsWith('/mcp') &&
    !window.location.pathname.startsWith('/workspace') &&
    !window.location.pathname.startsWith('/channels') &&
    !window.location.pathname.startsWith('/sessions') &&
    !window.location.pathname.startsWith('/cron-jobs') &&
    !window.location.pathname.startsWith('/heartbeat');

  return (
    <BrowserRouter>
      <GlobalStyle />
      <ConfigProvider {...bailianTheme} prefix="copaw" prefixCls="copaw">
        {shouldUseBrowserLayout ? (
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
