/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import {
  createExtension,
  coreExtensionData,
  createExtensionInput,
  useRouteRef,
  createNavItemExtension,
  createNavLogoExtension,
  createSchemaFromZod,
  iconsApiRef,
  useApi,
} from '@backstage/frontend-plugin-api';
import { makeStyles } from '@material-ui/core/styles';
import {
  Sidebar,
  useSidebarOpenState,
  Link,
  sidebarConfig,
  SidebarDivider,
  SidebarItem,
  SidebarGroup,
  SidebarSubmenu,
  SidebarSpace,
} from '@backstage/core-components';
// eslint-disable-next-line @backstage/no-relative-monorepo-imports
import LogoIcon from '../../../app/src/components/Root/LogoIcon';
// eslint-disable-next-line @backstage/no-relative-monorepo-imports
import LogoFull from '../../../app/src/components/Root/LogoFull';

const useSidebarLogoStyles = makeStyles({
  root: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
});

const SidebarLogo = (
  props: (typeof createNavLogoExtension.logoElementsDataRef)['T'],
) => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.root}>
      <Link to="/" underline="none" className={classes.link} aria-label="Home">
        {isOpen
          ? props?.logoFull ?? <LogoFull />
          : props?.logoIcon ?? <LogoIcon />}
      </Link>
    </div>
  );
};

function SidebarIcon(props: { id: string }) {
  const iconsApi = useApi(iconsApiRef);
  const Component = iconsApi.getIcon(props.id);
  return Component ? <Component /> : null;
}

function SidebarNavItem(
  props: (typeof createNavItemExtension.targetDataRef)['T'],
) {
  const { icon: Icon, title, routeRef } = props;
  const to = useRouteRef(routeRef)();
  // TODO: Support opening modal, for example, the search one
  return <SidebarItem to={to} icon={Icon} text={title} />;
}

export const AppNav = createExtension({
  namespace: 'app',
  name: 'nav',
  attachTo: { id: 'app/layout', input: 'nav' },
  configSchema: createSchemaFromZod(z => {
    const groupSchema = z
      .object({
        type: z.literal('drawer').optional(),
        title: z.string().default(''),
        icon: z.string().optional(),
        divider: z.boolean().default(false),
        spacer: z.boolean().default(false),
      })
      .extend({
        items: z.lazy(() => z.array(z.string().or(groupSchema)).default([])),
      });

    return z.object({
      pinner: z.boolean().default(false),
      groups: z.array(groupSchema).default([]),
    });
  }),
  inputs: {
    items: createExtensionInput({
      target: createNavItemExtension.targetDataRef,
    }),
    logos: createExtensionInput(
      {
        elements: createNavLogoExtension.logoElementsDataRef,
      },
      {
        singleton: true,
        optional: true,
      },
    ),
  },
  output: {
    element: coreExtensionData.reactElement,
  },
  factory({ inputs, config }) {
    const inputsByItem = inputs.items.reduce(
      (items, item) => ({
        ...items,
        [item.node.spec.id]: item,
      }),
      {},
    );

    if (!config.groups.length) {
      return {
        element: (
          <Sidebar>
            <SidebarLogo {...inputs.logos?.output.elements} />
            {inputs.items.map((item, index) => (
              <SidebarNavItem {...item.output.target} key={index} />
            ))}
          </Sidebar>
        ),
      };
    }

    // TODO: Fix mobile view
    // TODO: Add support for pinner
    return {
      element: (
        <Sidebar>
          <SidebarLogo {...inputs.logos?.output.elements} />
          {config.groups.map(function renderGroup(group) {
            const { type, title, icon, items, spacer, divider } = group;
            const Icon = () => (icon ? <SidebarIcon id={icon} /> : null);

            const children = (
              <SidebarGroup key={title} label={title} icon={<Icon />}>
                {items.map(item => {
                  if (typeof item !== 'string') return renderGroup(item);
                  const input = inputsByItem[item];
                  return input ? (
                    <SidebarNavItem {...input.output.target} key={item} />
                  ) : null;
                })}
              </SidebarGroup>
            );

            return (
              <>
                {type !== 'drawer' ? (
                  children
                ) : (
                  <SidebarItem icon={Icon} text={title}>
                    <SidebarSubmenu title={title}>{children}</SidebarSubmenu>
                  </SidebarItem>
                )}
                {spacer ? <SidebarSpace /> : null}
                {divider ? <SidebarDivider /> : null}
              </>
            );
          })}
        </Sidebar>
      ),
    };
  },
});
