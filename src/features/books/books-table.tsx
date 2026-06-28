"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { MoreHorizontal, Eye, Pencil, Trash2, BookOpen } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BookFormDialog } from "./book-form-dialog";
import { deleteBook } from "@/server/actions/books";
import { formatISBN } from "@/lib/utils";
import type { BookInput } from "@/lib/validations/book";

type Option = { id: string; name: string };

// Loosely typed to accept the relational shape returned by listBooks().
type BookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  isbn: string | null;
  coverUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  publishedYear: number | null;
  language: string;
  description: string | null;
  categoryId: string | null;
  publisherId: string | null;
  category?: { name: string; color: string | null } | null;
  bookAuthors?: { author: { name: string } }[];
};

export function BooksTable({
  books,
  categories,
  publishers,
  authors,
  canManage,
}: {
  books: BookRow[];
  categories: Option[];
  publishers: Option[];
  authors: Option[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<BookRow | null>(null);
  const [deleting, setDeleting] = React.useState<BookRow | null>(null);

  const columns = React.useMemo<ColumnDef<BookRow>[]>(() => {
    const base: ColumnDef<BookRow>[] = [
      {
        accessorKey: "title",
        header: "Book",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.coverUrl ?? "https://avatar.vercel.sh/" + b.id + ".png"}
                alt=""
                className="bg-muted h-12 w-9 shrink-0 rounded-md object-cover shadow-sm"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{b.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {b.bookAuthors?.map((ba) => ba.author.name).join(", ") ||
                    "Unknown author"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) =>
          row.original.category ? (
            <Badge
              variant="outline"
              style={{
                borderColor: `${row.original.category.color}55`,
                color: row.original.category.color ?? undefined,
              }}
            >
              {row.original.category.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "copies",
        header: "Availability",
        cell: ({ row }) => {
          const { availableCopies, totalCopies } = row.original;
          return (
            <span className="text-sm tabular-nums">
              <span
                className={
                  availableCopies > 0 ? "text-success" : "text-destructive"
                }
              >
                {availableCopies}
              </span>
              <span className="text-muted-foreground"> / {totalCopies}</span>
            </span>
          );
        },
      },
      {
        accessorKey: "isbn",
        header: "ISBN",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {formatISBN(row.original.isbn)}
          </span>
        ),
      },
    ];

    base.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const b = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/books/${b.id}`)}>
                  <Eye className="size-4" /> View
                </DropdownMenuItem>
                {canManage && (
                  <>
                    <DropdownMenuItem onClick={() => setEditing(b)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleting(b)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return base;
  }, [router, canManage]);

  return (
    <>
      <DataTable
        columns={columns}
        data={books}
        searchKey="title"
        searchPlaceholder="Search by title…"
        onRowClick={(b) => router.push(`/books/${b.id}`)}
        toolbar={
          canManage ? (
            <BookFormDialog
              categories={categories}
              publishers={publishers}
              authors={authors}
            />
          ) : undefined
        }
        emptyState={
          <EmptyState
            icon={BookOpen}
            title="No books yet"
            description="Add your first title to start building the catalog."
            className="border-0"
          />
        }
      />

      {/* Edit */}
      {editing && (
        <BookFormDialog
          open={Boolean(editing)}
          onOpenChange={(o) => !o && setEditing(null)}
          bookId={editing.id}
          categories={categories}
          publishers={publishers}
          authors={authors}
          initial={mapToInput(editing)}
        />
      )}

      {/* Delete */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.title}"?`}
        description="This removes the book and all its copies. This cannot be undone."
        confirmLabel="Delete book"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteBook(deleting.id);
          if (res.success) toast.success(res.message);
          else toast.error(res.error);
          setDeleting(null);
        }}
      />
    </>
  );
}

function mapToInput(b: BookRow): Partial<BookInput> {
  return {
    title: b.title,
    subtitle: b.subtitle ?? "",
    isbn: b.isbn ?? "",
    description: b.description ?? "",
    categoryId: b.categoryId ?? "",
    publisherId: b.publisherId ?? "",
    authorIds: b.bookAuthors?.map(() => "").filter(Boolean) ?? [],
    coverUrl: b.coverUrl ?? "",
    language: b.language,
    publishedYear: b.publishedYear ?? undefined,
    totalCopies: b.totalCopies,
  };
}
