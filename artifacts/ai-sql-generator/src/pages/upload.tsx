import { Layout } from "@/components/layout";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileType, FileText, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListDatasetsQueryKey, useGetDatasetRows, useGetDatasetColumns } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/data-table";

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadedDatasetId(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/datasets");
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(percentComplete);
        }
      };

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText));
          }
        };
        xhr.onerror = () => reject(new Error("Network Error"));
        xhr.send(formData);
      });

      setUploadedDatasetId((result as any).id);
      queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
      toast({
        title: "Upload complete",
        description: "Dataset has been successfully analyzed and stored.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const { data: rowsData, isLoading: isLoadingRows } = useGetDatasetRows(uploadedDatasetId!, {
    query: { enabled: !!uploadedDatasetId }
  });

  const { data: columnsData, isLoading: isLoadingCols } = useGetDatasetColumns(uploadedDatasetId!, {
    query: { enabled: !!uploadedDatasetId }
  });

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Upload Dataset</h1>
            <p className="text-muted-foreground mt-1">Add CSV or XLSX files to your analytics workspace.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse from your computer</p>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> CSV</span>
                    <span className="flex items-center gap-1"><FileType className="h-3 w-3" /> XLSX</span>
                  </div>
                </div>

                {file && !uploadedDatasetId && (
                  <div className="mt-6 p-4 rounded-lg bg-card border border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    {uploading ? (
                      <div className="w-32 flex flex-col gap-2">
                        <Progress value={progress} className="h-2" />
                        <span className="text-xs text-right text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                    ) : (
                      <Button onClick={handleUpload}>Upload Data</Button>
                    )}
                  </div>
                )}
                
                {uploadedDatasetId && (
                  <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-sm">Upload Successful</p>
                      <p className="text-xs opacity-80">Your dataset is ready to be queried.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>Ensure the first row contains column headers.</p>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>Dates should be in standard ISO formats (YYYY-MM-DD).</p>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>Maximum file size is 50MB for CSV and 25MB for XLSX.</p>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>Special characters in column names will be automatically normalized.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {uploadedDatasetId && (
            <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold tracking-tight">Dataset Preview</h2>
              
              <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Schema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCols ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {columnsData?.map((col) => (
                          <li key={col.name} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                            <span className="font-mono text-xs">{col.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{col.type}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="md:col-span-3 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Data Sample</CardTitle>
                    <CardDescription>First 100 rows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRows || !rowsData ? (
                      <div className="space-y-2">
                        <div className="h-8 bg-muted rounded w-full animate-pulse"></div>
                        <div className="h-24 bg-muted/50 rounded w-full animate-pulse"></div>
                      </div>
                    ) : (
                      <DataTable 
                        columns={rowsData.columns.map(c => ({ 
                          accessorKey: c.name, 
                          header: c.name,
                          cell: (info) => {
                            const val = info.getValue();
                            if (val === null || val === undefined) return <span className="text-muted-foreground italic">null</span>;
                            if (typeof val === 'object') return JSON.stringify(val);
                            return String(val);
                          }
                        }))} 
                        data={rowsData.rows} 
                        pagination={true}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
