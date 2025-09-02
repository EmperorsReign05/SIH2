"""
Biomass Analysis Module for Blue Carbon MRV Platform

This module provides functionality for analyzing drone imagery and calculating
biomass and carbon sequestration potential of blue carbon ecosystems.
"""

import os
import cv2
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Optional
import logging
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BiomassAnalyzer:
    """
    Analyzes drone imagery to estimate biomass and carbon sequestration potential
    for blue carbon ecosystems (mangroves, seagrasses, salt marshes).
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the biomass analyzer.
        
        Args:
            model_path: Path to pre-trained TensorFlow model for biomass estimation
        """
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'ndvi_mean', 'ndvi_std', 'ndvi_min', 'ndvi_max',
            'height_mean', 'height_std', 'height_min', 'height_max',
            'density_score', 'canopy_cover', 'species_diversity',
            'moisture_index', 'temperature', 'salinity'
        ]
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            self._initialize_default_model()
    
    def _initialize_default_model(self):
        """Initialize a default Random Forest model for biomass estimation."""
        logger.info("Initializing default biomass estimation model")
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
    
    def load_model(self, model_path: str):
        """Load a pre-trained TensorFlow model."""
        try:
            self.model = keras.models.load_model(model_path)
            logger.info(f"Model loaded successfully from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._initialize_default_model()
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocess drone imagery for analysis.
        
        Args:
            image_path: Path to the drone image
            
        Returns:
            Preprocessed image array
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image from {image_path}")
            
            # Convert to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Resize to standard size
            image_resized = cv2.resize(image_rgb, (512, 512))
            
            # Normalize pixel values
            image_normalized = image_resized.astype(np.float32) / 255.0
            
            return image_normalized
            
        except Exception as e:
            logger.error(f"Error preprocessing image {image_path}: {e}")
            raise
    
    def calculate_ndvi(self, image: np.ndarray) -> Dict[str, float]:
        """
        Calculate NDVI (Normalized Difference Vegetation Index) from multispectral imagery.
        
        Args:
            image: Multispectral image array
            
        Returns:
            Dictionary containing NDVI statistics
        """
        try:
            # For RGB images, estimate NDVI using vegetation indices
            # In a real implementation, you would use NIR and Red bands
            
            # Convert to float
            img_float = image.astype(np.float32)
            
            # Calculate vegetation index (simplified NDVI approximation)
            red = img_float[:, :, 0]
            green = img_float[:, :, 1]
            blue = img_float[:, :, 2]
            
            # Enhanced Vegetation Index (EVI) approximation
            evi = 2.5 * (green - red) / (green + 6 * red - 7.5 * blue + 1)
            
            # Calculate statistics
            ndvi_stats = {
                'ndvi_mean': float(np.mean(evi)),
                'ndvi_std': float(np.std(evi)),
                'ndvi_min': float(np.min(evi)),
                'ndvi_max': float(np.max(evi))
            }
            
            return ndvi_stats
            
        except Exception as e:
            logger.error(f"Error calculating NDVI: {e}")
            return {
                'ndvi_mean': 0.0,
                'ndvi_std': 0.0,
                'ndvi_min': 0.0,
                'ndvi_max': 0.0
            }
    
    def estimate_vegetation_height(self, image: np.ndarray) -> Dict[str, float]:
        """
        Estimate vegetation height using computer vision techniques.
        
        Args:
            image: Preprocessed image array
            
        Returns:
            Dictionary containing height statistics
        """
        try:
            # Convert to grayscale for edge detection
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Apply edge detection
            edges = cv2.Canny(gray, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Calculate height estimates based on contour properties
            heights = []
            for contour in contours:
                if cv2.contourArea(contour) > 100:  # Filter small contours
                    x, y, w, h = cv2.boundingRect(contour)
                    heights.append(h)
            
            if not heights:
                heights = [0]
            
            height_stats = {
                'height_mean': float(np.mean(heights)),
                'height_std': float(np.std(heights)),
                'height_min': float(np.min(heights)),
                'height_max': float(np.max(heights))
            }
            
            return height_stats
            
        except Exception as e:
            logger.error(f"Error estimating vegetation height: {e}")
            return {
                'height_mean': 0.0,
                'height_std': 0.0,
                'height_min': 0.0,
                'height_max': 0.0
            }
    
    def calculate_canopy_cover(self, image: np.ndarray) -> float:
        """
        Calculate canopy cover percentage from drone imagery.
        
        Args:
            image: Preprocessed image array
            
        Returns:
            Canopy cover percentage (0-100)
        """
        try:
            # Convert to HSV color space
            hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
            
            # Define green color range for vegetation
            lower_green = np.array([35, 40, 40])
            upper_green = np.array([85, 255, 255])
            
            # Create mask for vegetation
            mask = cv2.inRange(hsv, lower_green, upper_green)
            
            # Calculate canopy cover percentage
            total_pixels = mask.shape[0] * mask.shape[1]
            vegetation_pixels = np.sum(mask > 0)
            canopy_cover = (vegetation_pixels / total_pixels) * 100
            
            return float(canopy_cover)
            
        except Exception as e:
            logger.error(f"Error calculating canopy cover: {e}")
            return 0.0
    
    def estimate_species_diversity(self, image: np.ndarray) -> float:
        """
        Estimate species diversity based on color and texture variations.
        
        Args:
            image: Preprocessed image array
            
        Returns:
            Species diversity score (0-1)
        """
        try:
            # Convert to LAB color space for better color analysis
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            
            # Calculate color variance as a proxy for species diversity
            color_variance = np.var(lab, axis=(0, 1))
            diversity_score = np.mean(color_variance) / 255.0
            
            return float(np.clip(diversity_score, 0, 1))
            
        except Exception as e:
            logger.error(f"Error estimating species diversity: {e}")
            return 0.0
    
    def extract_features(self, image: np.ndarray, metadata: Dict = None) -> np.ndarray:
        """
        Extract all features from drone imagery for biomass estimation.
        
        Args:
            image: Preprocessed image array
            metadata: Additional metadata (temperature, salinity, etc.)
            
        Returns:
            Feature array for biomass estimation
        """
        try:
            # Calculate vegetation indices
            ndvi_stats = self.calculate_ndvi(image)
            
            # Estimate vegetation height
            height_stats = self.estimate_vegetation_height(image)
            
            # Calculate canopy cover
            canopy_cover = self.calculate_canopy_cover(image)
            
            # Estimate species diversity
            species_diversity = self.estimate_species_diversity(image)
            
            # Calculate density score (simplified)
            density_score = canopy_cover / 100.0
            
            # Get environmental parameters from metadata or use defaults
            moisture_index = metadata.get('moisture_index', 0.7) if metadata else 0.7
            temperature = metadata.get('temperature', 25.0) if metadata else 25.0
            salinity = metadata.get('salinity', 35.0) if metadata else 35.0
            
            # Combine all features
            features = np.array([
                ndvi_stats['ndvi_mean'],
                ndvi_stats['ndvi_std'],
                ndvi_stats['ndvi_min'],
                ndvi_stats['ndvi_max'],
                height_stats['height_mean'],
                height_stats['height_std'],
                height_stats['height_min'],
                height_stats['height_max'],
                density_score,
                canopy_cover,
                species_diversity,
                moisture_index,
                temperature,
                salinity
            ])
            
            return features.reshape(1, -1)
            
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return np.zeros((1, len(self.feature_names)))
    
    def estimate_biomass(self, image_path: str, metadata: Dict = None) -> Dict:
        """
        Estimate biomass from drone imagery.
        
        Args:
            image_path: Path to drone image
            metadata: Additional environmental metadata
            
        Returns:
            Dictionary containing biomass estimates and analysis results
        """
        try:
            logger.info(f"Analyzing biomass for image: {image_path}")
            
            # Preprocess image
            image = self.preprocess_image(image_path)
            
            # Extract features
            features = self.extract_features(image, metadata)
            
            # Normalize features
            features_scaled = self.scaler.fit_transform(features)
            
            # Make prediction
            if self.model is not None:
                if isinstance(self.model, keras.Model):
                    # TensorFlow model
                    biomass_prediction = float(self.model.predict(features_scaled)[0][0])
                else:
                    # Scikit-learn model
                    biomass_prediction = float(self.model.predict(features_scaled)[0])
            else:
                # Fallback calculation
                biomass_prediction = self._calculate_fallback_biomass(features[0])
            
            # Calculate carbon content (typically 45-50% of biomass)
            carbon_content = biomass_prediction * 0.47
            
            # Calculate CO2 equivalent (1 ton C = 3.67 tons CO2)
            co2_equivalent = carbon_content * 3.67
            
            # Generate analysis report
            analysis_results = {
                'image_path': image_path,
                'timestamp': datetime.now().isoformat(),
                'biomass_estimate_kg_m2': biomass_prediction,
                'carbon_content_kg_m2': carbon_content,
                'co2_equivalent_kg_m2': co2_equivalent,
                'features': dict(zip(self.feature_names, features[0])),
                'confidence_score': self._calculate_confidence(features[0]),
                'analysis_metadata': {
                    'model_type': type(self.model).__name__,
                    'feature_count': len(self.feature_names),
                    'image_resolution': f"{image.shape[1]}x{image.shape[0]}"
                }
            }
            
            logger.info(f"Biomass analysis completed: {biomass_prediction:.2f} kg/m²")
            return analysis_results
            
        except Exception as e:
            logger.error(f"Error in biomass estimation: {e}")
            return {
                'error': str(e),
                'image_path': image_path,
                'timestamp': datetime.now().isoformat()
            }
    
    def _calculate_fallback_biomass(self, features: np.ndarray) -> float:
        """
        Calculate biomass using a simple fallback model.
        
        Args:
            features: Feature array
            
        Returns:
            Biomass estimate in kg/m²
        """
        # Simple linear combination of features
        weights = np.array([0.3, 0.1, 0.1, 0.2, 0.2, 0.1, 0.1, 0.2, 0.3, 0.4, 0.2, 0.1, 0.05, 0.05])
        biomass = np.sum(features * weights)
        
        # Apply reasonable bounds
        biomass = np.clip(biomass, 0.1, 50.0)
        
        return float(biomass)
    
    def _calculate_confidence(self, features: np.ndarray) -> float:
        """
        Calculate confidence score for the biomass estimate.
        
        Args:
            features: Feature array
            
        Returns:
            Confidence score (0-1)
        """
        try:
            # Calculate confidence based on feature quality
            ndvi_quality = min(features[0] / 0.5, 1.0)  # NDVI mean quality
            height_quality = min(features[4] / 100.0, 1.0)  # Height mean quality
            canopy_quality = features[9] / 100.0  # Canopy cover quality
            
            confidence = (ndvi_quality + height_quality + canopy_quality) / 3.0
            return float(np.clip(confidence, 0.0, 1.0))
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {e}")
            return 0.5
    
    def analyze_multiple_images(self, image_paths: List[str], metadata: Dict = None) -> Dict:
        """
        Analyze multiple drone images and aggregate results.
        
        Args:
            image_paths: List of image paths
            metadata: Additional environmental metadata
            
        Returns:
            Aggregated analysis results
        """
        try:
            logger.info(f"Analyzing {len(image_paths)} images")
            
            results = []
            for image_path in image_paths:
                result = self.estimate_biomass(image_path, metadata)
                if 'error' not in result:
                    results.append(result)
            
            if not results:
                return {'error': 'No valid analysis results'}
            
            # Aggregate results
            biomass_values = [r['biomass_estimate_kg_m2'] for r in results]
            carbon_values = [r['carbon_content_kg_m2'] for r in results]
            co2_values = [r['co2_equivalent_kg_m2'] for r in results]
            confidence_values = [r['confidence_score'] for r in results]
            
            aggregated_results = {
                'total_images': len(image_paths),
                'valid_analyses': len(results),
                'biomass_summary': {
                    'mean': float(np.mean(biomass_values)),
                    'std': float(np.std(biomass_values)),
                    'min': float(np.min(biomass_values)),
                    'max': float(np.max(biomass_values)),
                    'total': float(np.sum(biomass_values))
                },
                'carbon_summary': {
                    'mean': float(np.mean(carbon_values)),
                    'std': float(np.std(carbon_values)),
                    'min': float(np.min(carbon_values)),
                    'max': float(np.max(carbon_values)),
                    'total': float(np.sum(carbon_values))
                },
                'co2_summary': {
                    'mean': float(np.mean(co2_values)),
                    'std': float(np.std(co2_values)),
                    'min': float(np.min(co2_values)),
                    'max': float(np.max(co2_values)),
                    'total': float(np.sum(co2_values))
                },
                'confidence_summary': {
                    'mean': float(np.mean(confidence_values)),
                    'std': float(np.std(confidence_values))
                },
                'individual_results': results,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"Multi-image analysis completed: {len(results)} valid results")
            return aggregated_results
            
        except Exception as e:
            logger.error(f"Error in multi-image analysis: {e}")
            return {'error': str(e)}
    
    def generate_report(self, analysis_results: Dict, output_path: str = None) -> str:
        """
        Generate a detailed analysis report.
        
        Args:
            analysis_results: Results from biomass analysis
            output_path: Path to save the report
            
        Returns:
            Report content as string
        """
        try:
            report = []
            report.append("=" * 60)
            report.append("BLUE CARBON BIOMASS ANALYSIS REPORT")
            report.append("=" * 60)
            report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            report.append("")
            
            if 'error' in analysis_results:
                report.append(f"ERROR: {analysis_results['error']}")
                return "\n".join(report)
            
            if 'individual_results' in analysis_results:
                # Multi-image analysis
                report.append("MULTI-IMAGE ANALYSIS SUMMARY")
                report.append("-" * 30)
                report.append(f"Total Images: {analysis_results['total_images']}")
                report.append(f"Valid Analyses: {analysis_results['valid_analyses']}")
                report.append("")
                
                biomass = analysis_results['biomass_summary']
                report.append("BIOMASS ESTIMATES (kg/m²)")
                report.append(f"  Mean: {biomass['mean']:.2f}")
                report.append(f"  Std Dev: {biomass['std']:.2f}")
                report.append(f"  Range: {biomass['min']:.2f} - {biomass['max']:.2f}")
                report.append(f"  Total: {biomass['total']:.2f}")
                report.append("")
                
                carbon = analysis_results['carbon_summary']
                report.append("CARBON CONTENT (kg/m²)")
                report.append(f"  Mean: {carbon['mean']:.2f}")
                report.append(f"  Total: {carbon['total']:.2f}")
                report.append("")
                
                co2 = analysis_results['co2_summary']
                report.append("CO2 EQUIVALENT (kg/m²)")
                report.append(f"  Mean: {co2['mean']:.2f}")
                report.append(f"  Total: {co2['total']:.2f}")
                report.append("")
                
            else:
                # Single image analysis
                report.append("SINGLE IMAGE ANALYSIS")
                report.append("-" * 25)
                report.append(f"Image: {analysis_results['image_path']}")
                report.append(f"Biomass: {analysis_results['biomass_estimate_kg_m2']:.2f} kg/m²")
                report.append(f"Carbon: {analysis_results['carbon_content_kg_m2']:.2f} kg/m²")
                report.append(f"CO2 Equivalent: {analysis_results['co2_equivalent_kg_m2']:.2f} kg/m²")
                report.append(f"Confidence: {analysis_results['confidence_score']:.2f}")
                report.append("")
            
            report.append("=" * 60)
            
            report_content = "\n".join(report)
            
            if output_path:
                with open(output_path, 'w') as f:
                    f.write(report_content)
                logger.info(f"Report saved to {output_path}")
            
            return report_content
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return f"Error generating report: {e}"


def main():
    """Example usage of the BiomassAnalyzer."""
    # Initialize analyzer
    analyzer = BiomassAnalyzer()
    
    # Example analysis
    image_path = "sample_drone_image.jpg"
    metadata = {
        'temperature': 28.5,
        'salinity': 32.0,
        'moisture_index': 0.8
    }
    
    if os.path.exists(image_path):
        results = analyzer.estimate_biomass(image_path, metadata)
        report = analyzer.generate_report(results, "biomass_report.txt")
        print(report)
    else:
        print(f"Sample image {image_path} not found. Please provide a valid image path.")


if __name__ == "__main__":
    main()
