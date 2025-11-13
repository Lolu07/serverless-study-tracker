@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Base name prefix for resources (letters/numbers only, short). Will be combined with uniqueString.')
param baseName string = 'study'

var namePrefix = toLower('${baseName}${uniqueString(resourceGroup().id)}')

var storageNameRaw = toLower(replace('${namePrefix}sa','-',''))
var storageName = length(storageNameRaw) < 3 ? '${storageNameRaw}xxx' : take(storageNameRaw, 24)

/* -------------------- Cosmos DB (serverless) -------------------- */
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: '${namePrefix}-cosmos'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'studytracker'
  properties: {
    resource: { id: 'studytracker' }
  }
}

resource sessionsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDb
  name: 'sessions'
  properties: {
    resource: {
      id: 'sessions'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

resource summariesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDb
  name: 'summaries'
  properties: {
    resource: {
      id: 'summaries'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

/* -------------------- Application Insights -------------------- */
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName // storage must be globally unique, <=24 chars, lowercase
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

/* -------------------- Function App (Consumption) -------------------- */
resource plan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${namePrefix}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

resource func 'Microsoft.Web/sites@2022-09-01' = {
  name: '${namePrefix}-func'
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }

        // Storage for Functions
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=core.windows.net' }

        // Cosmos settings (used by your app code)
        { name: 'COSMOS_ENDPOINT', value: cosmos.properties.documentEndpoint }
        { name: 'COSMOS_DB', value: 'studytracker' }
        { name: 'COSMOS_CONTAINER', value: 'sessions' }
        { name: 'COSMOS_SUMMARY_CONTAINER', value: 'summaries' }

        // App Insights
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appInsights.properties.InstrumentationKey }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: 'InstrumentationKey=${appInsights.properties.InstrumentationKey}' }
      ]
    }
  }
}

/* -------------------- Outputs for convenience -------------------- */
output functionAppName string = func.name
output functionApiBase string = 'https://${func.name}.azurewebsites.net/api'
output cosmosAccountName string = cosmos.name
output cosmosEndpoint string = cosmos.properties.documentEndpoint
output storageAccountName string = storage.name
output appInsightsName string = appInsights.name
