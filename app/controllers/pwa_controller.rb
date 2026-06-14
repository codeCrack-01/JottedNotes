class PwaController < ApplicationController
  skip_before_action :verify_authenticity_token, only: :service_worker
  layout false

  def manifest
    render formats: [:json]
  end

  def service_worker
    render formats: [:js]
  end
end
