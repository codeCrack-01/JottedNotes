Rails.application.routes.draw do
  root "home#index"

  get "manifest", to: "pwa#manifest", format: :json
  get "service-worker", to: "pwa#service_worker", as: :pwa_service_worker
end
