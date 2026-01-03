import React, { useRef, useState } from 'react';
import { KeenIcon } from '@/components/keenicons';
import { toAbsoluteUrl } from '@/utils';
import { Menu, MenuItem, MenuToggle } from '@/components';
import { DropdownUser } from '@/partials/dropdowns/user';
import { DropdownNotifications } from '@/partials/dropdowns/notifications';
import { DropdownApps } from '@/partials/dropdowns/apps';
import { DropdownChat } from '@/partials/dropdowns/chat';
import { ModalSearch } from '@/partials/modals/search/ModalSearch';
import { useLanguage } from '@/i18n';
import { useAuthContext } from '@/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
interface Universe {
  UniverseID: string;
  UniverseName: string;
}
interface Role {
  Id: number;
  Role: string;
  Description: string | null;
  Permissions: string | null;
  TenantId: number;
  UserCount: number;
  IsSystemRole: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}
interface HeaderProps {
  universes: Universe[];
  selectedUniverse: string;
  onUniverseChange: (universeId: string) => void; // callback to parent
}
const HeaderTopbar = () => {
  const { isRTL } = useLanguage();
  const itemChatRef = useRef<any>(null);
  const itemAppsRef = useRef<any>(null);
  const itemUserRef = useRef<any>(null);
  const itemNotificationsRef = useRef<any>(null);
  const handleShow = () => {
    window.dispatchEvent(new Event('resize'));
  };

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [hoveredUniverse, setHoveredUniverse] = useState<string | null>(null);
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const queryClient = useQueryClient();
  const handleOpen = () => setSearchModalOpen(true);
  const handleClose = () => {
    setSearchModalOpen(false);
  };
  const primaryRole = localStorage.getItem('PrimaryRole');

  console.log('Primary Role from localStorage:', primaryRole);
  React.useEffect(() => {
    if (primaryRole) {
      localStorage.setItem('currentUser', JSON.stringify(primaryRole));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [primaryRole]);
  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError
  } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/framework/permissionroles');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch roles: ${errorText}`);
      }
      return res.json();
    }
  });

  console.log(roles);

  const { data: universes = [], isLoading: universesLoading } = useQuery({
    queryKey: ['universes'],
    queryFn: async () => {
      const response = await fetch('/api/framework/universes');
      if (!response.ok) {
        throw new Error('Failed to fetch universes');
      }
      return response.json();
    }
  });
  console.log(universes);

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies', hoveredUniverse],
    queryFn: async () => {
      if (!hoveredUniverse) return [];
      const response = await fetch(`/api/framework/companies?universeId=${hoveredUniverse}`);
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
    enabled: !!hoveredUniverse
  });
  console.log(companies);

  return (
    <div className="flex items-center gap-2 lg:gap-3.5">
      {/* <button
        onClick={handleOpen}
        className="btn btn-icon btn-icon-lg size-9 rounded-full hover:bg-primary-light hover:text-primary text-gray-500"
      >
        <KeenIcon icon="magnifier" />
      </button>
      <ModalSearch open={searchModalOpen} onOpenChange={handleClose} /> */}

      {/* <Menu>
        <MenuItem
          ref={itemChatRef}
          onShow={handleShow}
          toggle="dropdown"
          trigger="click"
          dropdownProps={{
            placement: isRTL() ? 'bottom-start' : 'bottom-end',
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: isRTL() ? [-170, 10] : [170, 10]
                }
              }
            ]
          }}
        >
          <MenuToggle className="btn btn-icon btn-icon-lg size-9 rounded-full hover:bg-primary-light hover:text-primary dropdown-open:bg-primary-light dropdown-open:text-primary text-gray-500">
            <KeenIcon icon="messages" />
          </MenuToggle>

          {DropdownChat({ menuTtemRef: itemChatRef })}
        </MenuItem>
      </Menu> */}
      {/* 
      <Menu>
        <MenuItem
          ref={itemAppsRef}
          toggle="dropdown"
          trigger="click"
          dropdownProps={{
            placement: isRTL() ? 'bottom-start' : 'bottom-end',
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: isRTL() ? [-10, 10] : [10, 10]
                }
              }
            ]
          }}
        >
          <MenuToggle className="btn btn-icon btn-icon-lg size-9 rounded-full hover:bg-primary-light hover:text-primary dropdown-open:bg-primary-light dropdown-open:text-primary text-gray-500">
            <KeenIcon icon="element-11" />
          </MenuToggle>

          {DropdownApps()}
        </MenuItem>
      </Menu>

      <Menu>
        <MenuItem
          ref={itemNotificationsRef}
          toggle="dropdown"
          trigger="click"
          dropdownProps={{
            placement: isRTL() ? 'bottom-start' : 'bottom-end',
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: isRTL() ? [-70, 10] : [70, 10] // [skid, distance]
                }
              }
            ]
          }}
        >
          <MenuToggle className="btn btn-icon btn-icon-lg relative cursor-pointer size-9 rounded-full hover:bg-primary-light hover:text-primary dropdown-open:bg-primary-light dropdown-open:text-primary text-gray-500">
            <KeenIcon icon="notification-status" />
          </MenuToggle>
          {DropdownNotifications({ menuTtemRef: itemNotificationsRef })}
        </MenuItem>
      </Menu> */}

      <Select
        onValueChange={(value) => {
          if (value === 'all') {
            setSelectedUniverse(null); // no filter
            queryClient.setQueryData(['selectedUniverse'], null);
          } else {
            setSelectedUniverse(value);
            queryClient.setQueryData(['selectedUniverse'], value);
          }

          setHoveredUniverse(null);
        }}
        value={selectedUniverse || ''}
      >
        <SelectTrigger className="input mt-1">
          <SelectValue placeholder="Select Universe" />
        </SelectTrigger>

        <SelectContent className="bg-white dark:text-white dark:bg-black">
          <SelectItem value="all">All Universes</SelectItem>
          {universes.map((universe: any) => (
            <SelectItem
              key={universe.UniverseID}
              value={universe.UniverseID}
              onMouseEnter={(e) => {
                setHoveredUniverse(universe.UniverseID);
                setTooltipPosition({
                  x: e.clientX + 20,
                  y: e.clientY
                });
              }}
              onMouseMove={(e) =>
                setTooltipPosition({
                  x: e.clientX + 20,
                  y: e.clientY
                })
              }
              onMouseLeave={() => setHoveredUniverse(null)}
            >
              {' '}
              {universe.UniverseName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {primaryRole && (
        <div className="text-gray-300 text-sm font-semibold px-3 py-1 btn-outline btn-primary rounded-md border">
          <KeenIcon icon="user" className="pr-2" />
          {primaryRole}
        </div>
      )}

      <Menu>
        <MenuItem
          ref={itemUserRef}
          toggle="dropdown"
          trigger="click"
          dropdownProps={{
            placement: isRTL() ? 'bottom-start' : 'bottom-end',
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: isRTL() ? [-20, 10] : [20, 10] // [skid, distance]
                }
              }
            ]
          }}
        >
          <MenuToggle className="btn btn-icon rounded-full">
            <img
              className="size-9 rounded-full border-2 border-success shrink-0"
              src={toAbsoluteUrl('/media/avatars/300-2.png')}
              alt=""
            />
          </MenuToggle>
          {DropdownUser({ menuItemRef: itemUserRef })}
        </MenuItem>
      </Menu>
    </div>
  );
};

export { HeaderTopbar };
