namespace :pages do
  desc "Export static files for GitHub Pages deployment"
  task export: :environment do
    prefix = ENV.fetch("ASSET_PREFIX", nil)
    if prefix.blank?
      puts "ERROR: ASSET_PREFIX environment variable is required (e.g., ASSET_PREFIX=/JottedNotes)"
      exit 1
    end

    renderer = Class.new(ActionController::Base) do
      prepend_view_path "app/views"
    end

    output_dir = Rails.root.join("public", prefix.delete_prefix("/"))
    FileUtils.mkdir_p(output_dir)

    pages = {
      "home/index"              => { layout: "application", output: "index.html" },
      "pwa/manifest"            => { layout: false,         output: "manifest.json" },
      "pwa/service_worker"      => { layout: false,         output: "service-worker.js" }
    }

    # Read Propshaft manifest to get actual digest filenames for SW precache
    manifest_path = output_dir.join("assets", ".manifest.json")
    if File.exist?(manifest_path)
      manifest = JSON.parse(File.read(manifest_path))
      digests = manifest.values
        .map { |v| v["digested_path"] }
        .reject { |p| p.end_with?(".map") }
      ENV["PRECACHE_ASSETS"] = digests.to_json
    end

    pages.each do |template, config|
      puts "  Rendering #{template}..."
      html = renderer.render(
        template: template,
        layout: config[:layout]
      )
      File.write(output_dir.join(config[:output]), html)
      puts "    -> #{output_dir.join(config[:output])}"
    end

    ENV.delete("PRECACHE_ASSETS") if ENV["PRECACHE_ASSETS"]

    # Copy static assets (icons, offline page)
    %w[icon.png icon-192.png icon-180.png icon.svg offline.html].each do |file|
      src = Rails.root.join("public", file)
      if File.exist?(src)
        FileUtils.cp(src, output_dir.join(file))
        puts "    -> #{output_dir.join(file)}"
      end
    end

    puts "  Done! Static pages exported to #{output_dir}/"
  end
end
