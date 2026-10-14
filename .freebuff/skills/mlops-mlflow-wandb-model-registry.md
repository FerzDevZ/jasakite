---
name: mlops-mlflow-wandb-model-registry
description: Production MLOps pipeline for experiment tracking, model registry governance, artifact versioning with DVC, and automated deployment promotion gates.
---

# 🛠️ MLOps Pipeline with MLflow & Model Registry

This skill standardizes machine learning lifecycle management, metric logging, model lineage, and staging-to-production promotion gates.

---

## 🎯 Production Invariants
1. Never train models without logging hyperparameters, training curves, and validation metrics to MLflow / W&B.
2. Store serialized models in the MLflow Model Registry with semantic versions and signature input/output schemas.
3. Automate deployment gates: promote models from `Staging` to `Production` only when meeting pre-defined benchmark metrics.

---

## 💻 Full MLflow Training & Registry Workflow (`train_mlops.py`)

```python
import mlflow
import mlflow.sklearn
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split

mlflow.set_tracking_uri("sqlite:///mlflow.db")
mlflow.set_experiment("Breast_Cancer_Classification")

# 1. Load Data
data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(data.data, data.target, test_size=0.2, random_state=42)

# 2. Train with MLflow Tracking
params = {"n_estimators": 100, "max_depth": 5, "random_state": 42}

with mlflow.start_run(run_name="rf_baseline") as run:
    mlflow.log_params(params)
    
    clf = RandomForestClassifier(**params)
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds)
    auc = roc_auc_score(y_test, clf.predict_proba(X_test)[:, 1])
    
    mlflow.log_metrics({"accuracy": acc, "f1_score": f1, "roc_auc": auc})
    
    # 3. Log Model with Signature
    signature = mlflow.models.infer_signature(X_train, clf.predict(X_train))
    model_info = mlflow.sklearn.log_model(
        sk_model=clf,
        artifact_path="random_forest_model",
        signature=signature,
        registered_model_name="CancerClassifier",
    )
    
    print(f"✅ Model registered at URI: {model_info.model_uri}")
```
