---
name: tabular-xgboost-lightgbm-optuna-shap
description: Master tabular machine learning using LightGBM, XGBoost, CatBoost, Optuna Bayesian hyperparameter search, and SHAP model explainability.
---

# 📊 Tabular Machine Learning with LightGBM, Optuna & SHAP

This skill provides enterprise-grade structured data modeling, automated feature tuning, and explainable AI.

---

## 🎯 Production Invariants
1. Avoid data leakage: fit transformations strictly on training folds via `StratifiedKFold`.
2. Tune hyperparameters with Optuna using the Tree-structured Parzen Estimator (TPE).
3. Compute TreeSHAP values to deliver interpretable feature importance for business stakeholders.

---

## 💻 Optuna + LightGBM + SHAP Pipeline (`tabular_pipeline.py`)

```python
import lightgbm as lgb
import optuna
import shap
from sklearn.datasets import make_classification
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score

# Synthetic dataset
X, y = make_classification(n_samples=5000, n_features=20, n_informative=10, random_state=42)

def objective(trial):
    params = {
        "objective": "binary",
        "metric": "auc",
        "boosting_type": "gbdt",
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
        "num_leaves": trial.suggest_int("num_leaves", 15, 127),
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "min_child_samples": trial.suggest_int("min_child_samples", 10, 100),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
        "verbose": -1,
    }
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = []
    
    for train_idx, val_idx in cv.split(X, y):
        X_tr, y_tr = X[train_idx], y[train_idx]
        X_va, y_va = X[val_idx], y[val_idx]
        
        trn_data = lgb.Dataset(X_tr, label=y_tr)
        val_data = lgb.Dataset(X_va, label=y_va, reference=trn_data)
        
        model = lgb.train(params, trn_data, valid_sets=[val_data], num_boost_round=300, callbacks=[lgb.early_stopping(30, verbose=False)])
        preds = model.predict(X_va)
        scores.append(roc_auc_score(y_va, preds))
        
    return sum(scores) / len(scores)

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=20)
print(f"Best CV ROC-AUC: {study.best_value:.4f}")

# SHAP Explainability
best_model = lgb.LGBMClassifier(**study.best_params)
best_model.fit(X, y)
explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(X[:100])
print("✅ SHAP TreeExplainer ready for feature contribution analysis.")
```
