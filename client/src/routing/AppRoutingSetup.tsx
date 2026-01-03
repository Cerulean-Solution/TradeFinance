import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from '@/auth';
import { RequireAuth } from '@/auth/RequireAuth';
import { Demo1Layout } from '@/layouts/demo1';
import FrameworkDashboard from '@/pages/FrameworkFiles/FrameworkDashboard';
import GeographicManagement from '@/pages/FrameworkFiles/GeographicManagement';
import Localization from '@/pages/FrameworkFiles/Localization';
import SystemAssets from '@/pages/FrameworkComponent/SystemAssets';
import OrganizationalManagement from '@/pages/FrameworkFiles/OrganizationalStructure';
import UserManagement from '@/pages/Admin/UserManagement';
import CurrencyManagement from '@/pages/FrameworkFiles/CurrencyManagement';
import RoleManagement from '@/pages/Admin/RoleManagement';
import LcForm from '@/pages/LCFormFiles/LcForm';
import MTConverter from '@/pages/MTConverter/MTConverter';
import { RoleProvider } from '@/pages/FrameworkFiles/RoleContext';
import {  ErrorsRouting } from '@/errors';
import PromptManagement from '@/pages/FrameworkFiles/PromptManagement';
import CreatePrompt from '@/pages/FrameworkFiles/promptscreen/CreatePrompt';  
import Billing from '@/pages/Billing/Billing';
const AppRoutingSetup = (): ReactElement => {
  return (
     <RoleProvider>
      <Routes>
        <Route path="auth/*" element={<AuthPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Demo1Layout />}>
            <Route path="/" element={<Navigate to="/auth/classic/login" replace />} />
            <Route path="/FrameworkDashboard" element={<FrameworkDashboard />} />
            <Route path="/framework/geographic" element={<GeographicManagement />} />
            <Route path="/framework/Localization" element={<Localization />} />
            <Route path="/framework/organizational" element={<OrganizationalManagement />} />
            <Route path="/framework/CurrencyManagement" element={<CurrencyManagement />} />
            <Route path="/framework/SystemAssets" element={<SystemAssets />} />
            <Route path="/framework/prompt-management" element={<PromptManagement />} />
            <Route path="/framework/prompt-management/create" element={<CreatePrompt />} />
            <Route path="/framework/prompt-management/edit/:id" element={<CreatePrompt />} />
            <Route path="/framework/prompt-management/inherit/:id" element={<CreatePrompt inheritMode={true} />} />
            <Route path="/framework/prompt-management/view/:id" element={<CreatePrompt viewMode={true} />} />
            <Route path='/admin/RoleManagement' element={<RoleManagement/>}></Route>
            <Route path="/admin/user" element={<UserManagement />} />
            <Route path='/Form/LcForm' element={<LcForm/>} ></Route>
            <Route path='/Billing' element={<Billing/>} ></Route>
            <Route path='/MTconverter' element={<MTConverter/>} ></Route>
          </Route>
        </Route>
       <Route path="error/*" element={<ErrorsRouting />} />
        <Route path="*" element={<Navigate to="/error/404" />} />
      </Routes>
    </RoleProvider>
  );
};

export { AppRoutingSetup };
