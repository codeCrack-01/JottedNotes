// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
import * as bootstrap from "bootstrap"

import "trix"
import "@rails/actiontext"

// Ensure Trix is fully evaluated before appending configurations
if (window.Trix) {
    // 1. Allow custom inline highlight (background-color) styling
    window.Trix.config.textAttributes.highlightColor = {
        styleProperty: "backgroundColor",
        inheritable: true
    }

    // 2. Allow text sizing wrappers using custom inline font-size properties
    window.Trix.config.textAttributes.fontSize = {
        styleProperty: "fontSize",
        inheritable: true
    }
}