"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { bookSchema, type BookInput } from "@/lib/validations/book";
import { createBook, updateBook } from "@/server/actions/books";

type Option = { id: string; name: string };

export function BookFormDialog({
  categories,
  publishers,
  authors,
  trigger,
  initial,
  bookId,
  open: controlledOpen,
  onOpenChange,
}: {
  categories: Option[];
  publishers: Option[];
  authors: Option[];
  trigger?: React.ReactNode;
  initial?: Partial<BookInput>;
  bookId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [pending, startTransition] = React.useTransition();
  const isEdit = Boolean(bookId);

  const form = useForm<BookInput>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      isbn: "",
      description: "",
      categoryId: "",
      publisherId: "",
      authorIds: [],
      coverUrl: "",
      language: "en",
      totalCopies: 1,
      tags: [],
      ...initial,
    },
  });

  function onSubmit(values: BookInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateBook({ ...values, id: bookId })
        : await createBook(values);
      if (!res.success) {
        if (res.fieldErrors) {
          for (const [k, msgs] of Object.entries(res.fieldErrors)) {
            form.setError(k as keyof BookInput, { message: msgs?.[0] });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Saved.");
      setOpen(false);
      if (!isEdit) form.reset();
    });
  }

  const selectedAuthors = form.watch("authorIds");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" /> Add book
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEdit ? "Edit book" : "Add a new book"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details. Copies and barcodes are generated automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="book-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Dune" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISBN</FormLabel>
                  <FormControl>
                    <Input placeholder="9780441013593" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input placeholder="en" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="publisherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publisher</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select publisher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {publishers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Authors multi-select */}
            <FormField
              control={form.control}
              name="authorIds"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Authors</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        {field.value.length
                          ? `${field.value.length} selected`
                          : "Select authors"}
                        <ChevronsUpDown className="size-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-1">
                      <div className="max-h-52 overflow-y-auto">
                        {authors.map((a) => {
                          const checked = field.value.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() =>
                                field.onChange(
                                  checked
                                    ? field.value.filter((id) => id !== a.id)
                                    : [...field.value, a.id],
                                )
                              }
                              className="hover:bg-accent flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm"
                            >
                              {a.name}
                              {checked && <Check className="size-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {selectedAuthors.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedAuthors.map((id) => {
                        const a = authors.find((x) => x.id === id);
                        return a ? (
                          <Badge key={id} variant="secondary">
                            {a.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverUrl"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Cover image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://covers.openlibrary.org/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publishedYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Published year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1965"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalCopies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of copies</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="A short synopsis…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button type="submit" form="book-form" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
