"use client";

import { useMemo, useState } from "react";
import { TableProperties } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ExtractionResultItem,
  ExtractionResultItemStatus,
  ExtractionResultItemType,
} from "@/types/extraction-results";
import { ExtractionResultStatusBadge } from "./ExtractionResultStatusBadge";

interface ResultItemTableProps {
  items: ExtractionResultItem[];
  selectedItemId: string | null;
  onSelectItem: (item: ExtractionResultItem) => void;
}

export function ResultItemTable({
  items,
  selectedItemId,
  onSelectItem,
}: ResultItemTableProps) {
  const [typeFilter, setTypeFilter] = useState<ExtractionResultItemType | "all">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    ExtractionResultItemStatus | "all"
  >("all");

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (typeFilter === "all" || item.itemType === typeFilter) &&
          (statusFilter === "all" || item.status === statusFilter)
      ),
    [items, statusFilter, typeFilter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review items</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Extracted tables, compounds, measurements, and references.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Item type</span>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.currentTarget.value as ExtractionResultItemType | "all"
                )
              }
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All types</option>
              <option value="table">table</option>
              <option value="compound">compound</option>
              <option value="reaction">reaction</option>
              <option value="property">property</option>
              <option value="experimental_condition">experimental_condition</option>
              <option value="measurement">measurement</option>
              <option value="reference">reference</option>
              <option value="note">note</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.currentTarget.value as ExtractionResultItemStatus | "all"
                )
              }
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">pending</option>
              <option value="accepted">accepted</option>
              <option value="corrected">corrected</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
            <TableProperties className="size-9 text-muted-foreground" />
            <p className="text-sm font-medium">No matching items</p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Change the filters to inspect the extracted result items.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[34rem]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    data-state={selectedItemId === item.id ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => onSelectItem(item)}
                  >
                    <TableCell>
                      <p className="font-medium">{item.label ?? "Untitled item"}</p>
                      <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                        {item.id}
                      </p>
                    </TableCell>
                    <TableCell>{item.itemType}</TableCell>
                    <TableCell>
                      <ExtractionResultStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>{formatConfidence(item.confidenceScore)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function formatConfidence(value: number | null): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "n/a";
}
