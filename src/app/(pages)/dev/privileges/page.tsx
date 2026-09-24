"use client";

import React from "react";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createPrivilege,
  getAllPrivilege,
} from "@/services/user-management/privilege-services";

interface Privilege {
  id: number;
  privilege: string;
  group: string;
  access_key: string;
  description: string;
}

function page() {
  const [privilege, setPrivilege] = useState<Privilege[]>([]);
  const [privilegeName, setPrivilegeName] = useState("");
  const [group, setGroup] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [description, setDescription] = useState("");
  const [editingPrivilege, setEditingPrivilege] = useState<Privilege | null>(
    null
  );

  useEffect(() => {
    getPrivilege();
  }, []);

  const getPrivilege = async () => {
    const response = await getAllPrivilege();
    if (response.status == 200) {
      setPrivilege(response.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPrivilege) {
      // Update existing company
      const updatedCompany = { ...editingPrivilege, privilege: privilegeName, group: group, access_key: accessKey, description: description };
      const response = await createPrivilege(updatedCompany);

      if (response.status === 201) {
        // console.log(response.data);
        getPrivilege();
      }

      setEditingPrivilege(null);
    } else {
      // Create new company
      const response = await createPrivilege({ privilege: privilegeName, group: group, access_key: accessKey, description: description });

      if (response.status === 201) {
        // console.log(response.data);
        getPrivilege();
      }
    }

    // setPrivilegeName("");
  };

  const handleEdit = (privilege: Privilege) => {
    setEditingPrivilege(privilege);
    setPrivilegeName(privilege.privilege);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 pt-10">
      <div className="w-full lg:w-1/2">
        <Card>
          <CardTitle>
            <div className="flex items-center ml-4 text-xs">
              <Plus className="h-4" /> New Privilege
            </div>
          </CardTitle>
          <CardContent className="">
            <form onSubmit={handleSubmit} className="space-y-2 flex gap-2">
              <Input
                value={privilegeName}
                onChange={(e) => setPrivilegeName(e.target.value)}
                placeholder="Privilege Name"
                required
                className="text-xs h-6"
              />
              <Input
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Group"
                required
                className="text-xs h-6"
              />
              <Input
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Access Key"
                required
                className="text-xs h-6"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                required
                className="text-xs h-6"
              />
              <Button
                variant="default"
                className="text-xs h-6 ml-auto"
                type="submit"
              >
                {editingPrivilege ? "Update Privilege" : "Create Privilege"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-1/2 border  rounded-lg text-xs overflow-x-auto">
        <Table className="">
          <TableHeader >
            <TableRow>
              <TableHead className="text-left text-xs">Privilege Name</TableHead>
              <TableHead className="text-left text-xs">Group</TableHead>
              <TableHead className="text-left text-xs">Access Key</TableHead>
              <TableHead className="text-left text-xs">Description</TableHead>
              <TableHead className="text-center text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {privilege.map((privilege) => (
              <React.Fragment key={privilege.id}>
                <TableRow>
                  <TableCell className="text-left text-xs">
                    {privilege.privilege}
                  </TableCell>
                  <TableCell className="text-left text-xs">
                    {privilege?.group}
                  </TableCell>
                  <TableCell className="text-left text-xs">
                    {privilege?.access_key}
                  </TableCell>
                  <TableCell className="text-left text-xs">
                    {privilege?.description}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        className="text-xs h-6"
                        variant="ghost"
                        onClick={() => handleEdit(privilege)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-6"
                        variant="destructive"
                      // onClick={() => handleDelete(privilege.id)}
                      >
                        <X />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default page;
