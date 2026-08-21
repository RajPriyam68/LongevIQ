'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { UserRole, AdminUser } from '@longeviq/shared';
import { apiAdminListUsers } from '@/lib/admin-api';
import { adminRoleLabel, formatAdminDateTime } from '@/lib/admin-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const ROLE_ORDER: UserRole[] = ['USER', 'DOCTOR', 'ADMIN'];
const PAGE_SIZE = 20;

function RoleFilter({
  value,
  onChange,
}: {
  value: UserRole | undefined;
  onChange: (role: UserRole | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={value === undefined ? 'default' : 'outline'}
        onClick={() => onChange(undefined)}
      >
        All
      </Button>
      {ROLE_ORDER.map((role) => (
        <Button
          key={role}
          type="button"
          size="sm"
          variant={value === role ? 'default' : 'outline'}
          onClick={() => onChange(role)}
        >
          {adminRoleLabel(role)}
        </Button>
      ))}
    </div>
  );
}

function ActiveFilter({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (active: boolean | undefined) => void;
}) {
  const options: Array<{ label: string; value: boolean | undefined }> = [
    { label: 'All', value: undefined },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];
  return (
    <div className="flex items-center gap-2">
      {options.map((option) => (
        <Button
          key={option.label}
          type="button"
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{adminRoleLabel(user.role)}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {user.emailVerified ? (
            <Badge variant="success">Verified</Badge>
          ) : (
            <Badge variant="secondary">Unverified</Badge>
          )}
          {user.isActive ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatAdminDateTime(user.createdAt)}
      </td>
    </tr>
  );
}

export function AdminUsers() {
  const [search, setSearch] = React.useState('');
  const [submittedSearch, setSubmittedSearch] = React.useState('');
  const [role, setRole] = React.useState<UserRole | undefined>(undefined);
  const [active, setActive] = React.useState<boolean | undefined>(undefined);
  const [page, setPage] = React.useState(1);

  const usersQuery = useQuery({
    queryKey: ['admin-users', { search: submittedSearch, role, active, page }],
    queryFn: () =>
      apiAdminListUsers({
        search: submittedSearch || undefined,
        role,
        active,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const changeRole = (next: UserRole | undefined) => {
    setRole(next);
    setPage(1);
  };

  const changeActive = (next: boolean | undefined) => {
    setActive(next);
    setPage(1);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    setPage(1);
  };

  const users = usersQuery.data?.users;
  const pagination = users?.pagination;

  return (
    <section aria-label="User directory">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <RoleFilter value={role} onChange={changeRole} />
          <ActiveFilter value={active} onChange={changeActive} />
        </div>
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              className="w-64 pl-8"
              aria-label="Search users"
            />
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {pagination ? `${pagination.total} user${pagination.total === 1 ? '' : 's'}` : 'Users'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : !users || users.items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">
                      User
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.items.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || usersQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages || usersQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
