from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel


class HealthStatus(BaseModel):
    status: str


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool = True
    sampleValues: list[Any] = []


class Dataset(BaseModel):
    id: str
    name: str
    fileName: str
    fileType: str
    rowCount: int
    columnCount: int
    sizeBytes: Optional[int] = None
    createdAt: str
    tableName: str
    columns: list[ColumnInfo] = []


class DatasetPreview(BaseModel):
    columns: list[ColumnInfo]
    rows: list[dict[str, Any]]
    totalRows: int


class DbConnection(BaseModel):
    id: str
    name: str
    dbType: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    createdAt: str
    isActive: bool


class DbConnectionInput(BaseModel):
    name: str
    dbType: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    connectionString: Optional[str] = None


class ConnectionTestResult(BaseModel):
    success: bool
    message: str


class QueryGenerateInput(BaseModel):
    question: str
    datasetId: Optional[str] = None
    connectionId: Optional[str] = None
    conversationId: Optional[str] = None
    tableSchema: Optional[str] = None


class QueryGenerateResult(BaseModel):
    sql: str
    explanation: str
    provider: str
    confidence: Optional[float] = None
    conversationId: str
    historyId: str
    warnings: list[str] = []


class QueryExecuteInput(BaseModel):
    sql: str
    datasetId: Optional[str] = None
    connectionId: Optional[str] = None
    historyId: Optional[str] = None


class QueryExecuteResult(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    rowCount: int
    executionTimeMs: float
    chartType: Optional[str] = None
    chartConfig: Optional[dict[str, Any]] = None


class QueryValidateInput(BaseModel):
    sql: str
    datasetId: Optional[str] = None


class QueryValidateResult(BaseModel):
    isValid: bool
    isDangerous: bool = False
    warnings: list[str] = []
    errors: list[str] = []
    dangerousStatements: list[str] = []


class QueryExplainInput(BaseModel):
    sql: str


class SqlBreakdown(BaseModel):
    tables: list[str] = []
    columns: list[str] = []
    filters: list[str] = []
    joins: list[str] = []
    groupBy: list[str] = []
    orderBy: list[str] = []


class QueryExplainResult(BaseModel):
    explanation: str
    breakdown: Optional[SqlBreakdown] = None


class HistoryEntry(BaseModel):
    id: str
    question: str
    sql: str
    explanation: Optional[str] = None
    datasetId: Optional[str] = None
    datasetName: Optional[str] = None
    connectionId: Optional[str] = None
    conversationId: Optional[str] = None
    rowCount: Optional[int] = None
    executionTimeMs: Optional[float] = None
    provider: Optional[str] = None
    createdAt: str


class Conversation(BaseModel):
    id: str
    title: str
    createdAt: str
    updatedAt: str
    messageCount: int
    datasetId: Optional[str] = None


class ConversationInput(BaseModel):
    title: str
    datasetId: Optional[str] = None


class InsightsInput(BaseModel):
    question: str
    sql: str
    rows: list[dict[str, Any]]
    columns: list[str]
    datasetName: Optional[str] = None


class Insight(BaseModel):
    type: str
    title: str
    description: str
    value: Optional[str] = None


class InsightsResult(BaseModel):
    summary: str
    insights: list[Insight]
    recommendations: list[str] = []


class ExportInput(BaseModel):
    rows: list[dict[str, Any]]
    columns: list[str]
    fileName: Optional[str] = None


class SqlExportInput(BaseModel):
    sql: str
    fileName: Optional[str] = None


class ExportResult(BaseModel):
    downloadUrl: str
    fileName: str
    sizeBytes: Optional[int] = None


class DatasetStat(BaseModel):
    name: str
    queryCount: int


class PlatformStats(BaseModel):
    totalDatasets: int
    totalQueries: int
    totalConnections: int
    totalConversations: int
    recentQueriesCount: int
    topDatasets: list[DatasetStat] = []
