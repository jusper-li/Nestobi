import { useState } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import Login from '../components/Login';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Dashboard from '../components/Dashboard';
import MemberManagement from '../components/modules/MemberManagement';
import ProductManagement from '../components/modules/ProductManagement';
import OrderManagement from '../components/modules/OrderManagement';
import ArticleManagement from '../components/modules/ArticleManagement';
import StoreManagement from '../components/modules/StoreManagement';
import FAQManagement from '../components/modules/FAQManagement';
import HomepageManagement from '../components/modules/HomepageManagement';
import PaymentManagement from '../components/modules/PaymentManagement';
import SocialManagement from '../components/modules/SocialManagement';
import LanguageManagement from '../components/modules/LanguageManagement';
import SEOManagement from '../components/modules/SEOManagement';
import AIChat from '../components/modules/AIChat';
import AIAnalytics from '../components/modules/AIAnalytics';
import PermissionManagement from '../components/modules/PermissionManagement';
import KnowledgeBaseManagement from '../components/modules/KnowledgeBaseManagement';
import AITraining from '../components/modules/AITraining';
import StaticPageManagement from '../components/modules/StaticPageManagement';
import { useLanguage } from '../contexts/LanguageContext';

function AdminPanel() {
  const { t } = useLanguage();
  const { admin, isLoading } = useAuth();
  const [activeModule, setActiveModule] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm tracking-[0.2em] text-white/70">{t('backoffice.loading', '驗證後台權限')}</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Login />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'members':
        return <MemberManagement />;
      case 'products':
        return <ProductManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'articles':
        return <ArticleManagement />;
      case 'stores':
        return <StoreManagement />;
      case 'faq':
        return <FAQManagement />;
      case 'homepage':
        return <HomepageManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'social':
        return <SocialManagement />;
      case 'languages':
        return <LanguageManagement />;
      case 'seo':
        return <SEOManagement />;
      case 'ai-chat':
        return <AIChat />;
      case 'knowledge-base':
        return <KnowledgeBaseManagement />;
      case 'ai-training':
        return <AITraining />;
      case 'ai-analytics':
        return <AIAnalytics />;
      case 'permissions':
        return <PermissionManagement />;
      case 'static-pages':
        return <StaticPageManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}

export default function Backoffice() {
  return (
    <AuthProvider>
      <AdminPanel />
    </AuthProvider>
  );
}
