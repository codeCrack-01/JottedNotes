if ENV["ASSET_PREFIX"].present?
  prefix = ENV["ASSET_PREFIX"]
  Rails.application.config.assets.prefix = "#{prefix}/assets"
end
