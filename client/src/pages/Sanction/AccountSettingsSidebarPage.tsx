import { Fragment } from 'react';
import { Container } from '@/components/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle
} from '@/partials/toolbar';
// import { PageNavbar } from '@/pages/account';

// import { AccountSettingsSidebarContent } from '.';
import { useLayout } from '@/providers';
import AccountSettingsSidebarContent from './AccountSettingsSidebarContent';

const AccountSettingsSidebarPage = () => {
  const { currentLayout } = useLayout();

  return (
    <Fragment>
      {/* <PageNavbar /> */}
       <div className="w-full p-6 space-y-6 card ">
         {currentLayout?.name === 'demo1-layout' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <span className='flex'>
                <img src="/media/images/FrameworkImages/sanctions.png" alt="sanction" className="h-6 w-6 mr-2" />
              <ToolbarPageTitle />
              </span>
              
              <ToolbarDescription>Intuitive Access to In-Depth Customization</ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <a href="#" className="btn btn-sm btn-light">
                Public Profile
              </a>
              <a href="#" className="btn btn-sm btn-primary">
                Get Started
              </a>
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}

  
        <AccountSettingsSidebarContent />
   
      </div>

     
    </Fragment>
  );
};

export default AccountSettingsSidebarPage ;
